#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk, { supportsColor } from 'chalk';
import { prepareEnvironment } from './env.js';
import { executeLint } from './execute.js';
import { watchMode } from './watch.js';
import writeFileAtomic from 'write-file-atomic';

function initConfig(initFormat?: string) {
  const supported = new Set(['json', 'js', 'cjs', 'mjs', 'ts', 'mts']);
  let format = initFormat;
  if (format && !supported.has(format)) {
    console.error(
      `Unsupported init format: "${format}". Supported formats: ${[...supported].join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }
  if (!format) {
    const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      format = 'ts';
    } else {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkgText = fs.readFileSync(pkgPath, 'utf8');
          const pkg: {
            dependencies?: Record<string, unknown>;
            devDependencies?: Record<string, unknown>;
          } = JSON.parse(pkgText);
          if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript)
            format = 'ts';
        } catch {}
      }
    }
    if (!format) format = 'json';
  }

  const configPath = path.resolve(process.cwd(), `designlint.config.${format}`);
  if (fs.existsSync(configPath)) {
    console.log(`designlint.config.${format} already exists`);
    return;
  }

  let contents = '';
  switch (format) {
    case 'json':
      contents = `${JSON.stringify({ tokens: {}, rules: {} }, null, 2)}\n`;
      break;
    case 'js':
    case 'cjs':
      contents = `module.exports = {\n  tokens: {},\n  rules: {},\n};\n`;
      break;
    case 'mjs':
      contents = `export default {\n  tokens: {},\n  rules: {},\n};\n`;
      break;
    case 'ts':
    case 'mts':
      contents = `import { defineConfig } from '@lapidist/design-lint';\n\nexport default defineConfig({\n  tokens: {},\n  rules: {},\n});\n`;
      break;
  }

  writeFileAtomic.sync(configPath, contents);
  console.log(`Created designlint.config.${format}`);
}

function createProgram(version: string) {
  const program = new Command();
  program
    .name('design-lint')
    .usage('[files...]')
    .version(version, '--version', 'Show version number')
    .helpOption('--help', 'Show this message')
    .argument('[files...]')
    .option('--config <path>', 'Path to configuration file')
    .option(
      '--format <name|path>',
      'Output format (stylish, json, sarif, or path to module)',
      'stylish',
    )
    .option('--output <file>', 'Write report to file')
    .option('--report <file>', 'Write JSON results to file')
    .option('--ignore-path <file>', 'Load additional ignore patterns from file')
    .option(
      '--concurrency <n>',
      'Maximum number of files processed concurrently',
      (val: string) => {
        const n = Number(val);
        if (!Number.isInteger(n) || n <= 0)
          throw new Error(
            `Invalid value for --concurrency: "${val}". Expected a positive integer.`,
          );
        return n;
      },
    )
    .option(
      '--max-warnings <n>',
      'Number of warnings to trigger nonzero exit code',
      (val: string) => {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 0)
          throw new Error(
            `Invalid value for --max-warnings: "${val}". Expected a non-negative integer.`,
          );
        return n;
      },
    )
    .option('--quiet', 'Suppress stdout output')
    .option('--no-color', 'Disable colored output')
    .option('--cache', 'Enable persistent caching')
    .option('--cache-location <path>', 'Path to cache file')
    .option('--watch', 'Watch files and re-lint on changes')
    .option('--fix', 'Automatically fix problems');

  program
    .command('init')
    .description('Create a starter designlint.config.*')
    .option(
      '--init-format <fmt>',
      "Config format for 'init' (js, cjs, mjs, ts, mts, json)",
    )
    .action((opts) => {
      initConfig(opts.initFormat);
    });
  return program;
}

export async function run(argv = process.argv.slice(2)) {
  const current = process.versions.node;
  const [major] = current.split('.').map(Number);
  if (major < 22) {
    const message = `Node.js v${current} is not supported. Please upgrade to v22.0.0 or higher.`;
    console.error(message);
    process.exitCode = 1;
    return;
  }

  let useColor = Boolean(process.stdout.isTTY && supportsColor);
  const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
  const pkgData = fs.readFileSync(pkgPath, 'utf8');
  const pkg: { version: string } = JSON.parse(pkgData);

  const program = createProgram(pkg.version);

  program.action(async (files: string[], options) => {
    if (options.color === false) useColor = false;
    const targets = files.length ? files : ['.'];
    try {
      const env = await prepareEnvironment(options);
      const services = { ...env, useColor };
      const { exitCode } = await executeLint(targets, options, services);
      process.exitCode = exitCode;
      if (options.watch) await watchMode(targets, options, services);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(useColor ? chalk.red(message) : message);
      process.exitCode = 1;
    }
  });

  await program.parseAsync(argv, { from: 'user' });
}

try {
  if (
    process.argv[1] &&
    fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
  ) {
    run();
  }
} catch {
  // ignore resolution errors
}
