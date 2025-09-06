#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'node:perf_hooks';
import { Command } from 'commander';
import chalk, { supportsColor } from 'chalk';
import ignore from 'ignore';
import { relFromCwd, realpathIfExists } from '../utils/paths.js';
import writeFileAtomic from 'write-file-atomic';
import { getFormatter } from '../formatters/index.js';
import { startWatch } from './watch.js';
import { loadCache, type Cache } from '../core/cache.js';

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
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
            dependencies?: Record<string, unknown>;
            devDependencies?: Record<string, unknown>;
          };
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
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    version: string;
  };

  const program = new Command();
  program
    .name('design-lint')
    .usage('[files...]')
    .version(pkg.version, '--version', 'Show version number')
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

  program.action(async (files: string[], options) => {
    if (options.color === false) useColor = false;
    let formatter: Awaited<ReturnType<typeof getFormatter>>;
    try {
      formatter = await getFormatter(options.format as string);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(useColor ? chalk.red(message) : message);
      process.exitCode = 1;
      return;
    }
    const targets = files.length ? files : ['.'];
    const [{ loadConfig }, { Linter }, { loadIgnore }] = await Promise.all([
      import('../config/loader.js'),
      import('../core/linter.js'),
      import('../core/ignore.js'),
    ]);
    let config = await loadConfig(process.cwd(), options.config);
    if (options.concurrency !== undefined)
      config.concurrency = options.concurrency;
    const maxWarnings: number | undefined = options.maxWarnings;
    if (config.configPath)
      config.configPath = realpathIfExists(config.configPath);
    const linterRef = { current: new Linter(config) };
    let pluginPaths = await linterRef.current.getPluginPaths();
    const cacheLocation = options.cache
      ? path.resolve(process.cwd(), options.cacheLocation ?? '.designlintcache')
      : undefined;
    const cache: Cache | undefined = cacheLocation
      ? loadCache(cacheLocation)
      : undefined;
    let ignorePath: string | undefined;
    if (options.ignorePath) {
      const resolved = path.resolve(options.ignorePath as string);
      if (!fs.existsSync(resolved)) {
        const message = `Ignore file not found: "${relFromCwd(resolved)}"`;
        console.error(useColor ? chalk.red(message) : message);
        process.exitCode = 1;
        return;
      }
      ignorePath = realpathIfExists(resolved);
    }
    const gitIgnore = realpathIfExists(path.join(process.cwd(), '.gitignore'));
    const designIgnore = realpathIfExists(
      path.join(process.cwd(), '.designlintignore'),
    );
    let ig = ignore();
    const refreshIgnore = async () => {
      const { ig: newIg } = await loadIgnore(
        config,
        ignorePath ? [ignorePath] : [],
      );
      ig = newIg;
    };
    await refreshIgnore();
    const state = { pluginPaths, ignoreFilePaths: [] as string[] };
    const runLint = async (paths: string[]): Promise<string[]> => {
      const start = performance.now();
      const {
        results,
        ignoreFiles: newIgnore = [],
        warning,
      } = await linterRef.current.lintFiles(
        paths,
        options.fix,
        cache,
        ignorePath ? [ignorePath] : [],
        cacheLocation,
      );
      const duration = performance.now() - start;
      if (warning && !options.quiet) console.warn(warning);
      const output = formatter(results, useColor);
      if (options.output) {
        await writeFileAtomic(options.output as string, output);
      } else if (!options.quiet) {
        console.log(output);
      }
      if (
        !options.quiet &&
        (options.format === undefined || options.format === 'stylish')
      ) {
        const time = (duration / 1000).toFixed(2);
        const count = results.length;
        const stat = `\nLinted ${count} file${count === 1 ? '' : 's'} in ${time}s`;
        console.log(useColor ? chalk.cyan.bold(stat) : stat);
      }
      if (options.report) {
        await writeFileAtomic(
          options.report as string,
          JSON.stringify({ results, ignoreFiles: newIgnore }, null, 2),
        );
      }
      const hasErrors = results.some((r) =>
        r.messages.some((m) => m.severity === 'error'),
      );
      const warningCount = results.reduce(
        (count, r) =>
          count + r.messages.filter((m) => m.severity === 'warn').length,
        0,
      );
      let exit = hasErrors ? 1 : 0;
      if (maxWarnings !== undefined && warningCount > maxWarnings) exit = 1;
      process.exitCode = exit;
      state.ignoreFilePaths = newIgnore;
      return newIgnore;
    };
    const reportError = (err: unknown) => {
      const output =
        err instanceof Error && err.stack ? err.stack : String(err);
      console.error(useColor ? chalk.red(output) : output);
      process.exitCode = 1;
    };
    const firstIgnore = await runLint(targets);
    state.ignoreFilePaths = firstIgnore;
    if (options.watch) {
      await startWatch({
        targets,
        options,
        config,
        refreshIgnore,
        cache,
        cacheLocation,
        state,
        designIgnore,
        gitIgnore,
        runLint,
        linterRef,
        reportError,
        getIg: () => ig,
        useColor,
      });
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
