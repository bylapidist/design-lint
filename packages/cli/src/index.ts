#!/usr/bin/env node
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk, { supportsColor } from 'chalk';
import { prepareEnvironment, type PrepareEnvironmentOptions } from './env.js';
import { executeLint, type ExecuteOptions } from './execute.js';
import { watchMode } from './watch.js';
import { initConfig } from './init-config.js';

type CliOptions = ExecuteOptions &
  PrepareEnvironmentOptions & {
    color?: boolean;
    watch?: boolean;
  };

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
    .action((opts: { initFormat?: string }) => {
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
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
  const pkgData = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgData) as unknown as { version: string };

  const program = createProgram(pkg.version);

  program.action(async (files: string[], options: CliOptions) => {
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
    void run();
  }
} catch {
  // ignore resolution errors
}
