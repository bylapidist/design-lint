#!/usr/bin/env node
import fs from 'fs';
import { parseArgs } from 'node:util';
import path from 'path';
import { createRequire } from 'module';
import { once } from 'node:events';
import { pathToFileURL, fileURLToPath } from 'url';
import type { LintResult } from '../core/types.js';
import type { Config } from '../core/linter.js';
import { getFormatter } from '../formatters/index.js';
import chalk, { supportsColor } from 'chalk';
import ignore from 'ignore';
import chokidar, { FSWatcher } from 'chokidar';
import { relFromCwd, realpathIfExists } from '../utils/paths.js';
import writeFileAtomic from 'write-file-atomic';

/**
 * Print the package version to stdout.
 */
function showVersion() {
  const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    version: string;
  };
  console.log(pkg.version);
}

/**
 * Create a starter configuration file in the current directory.
 * Side effect: writes "designlint.config.*".
 * @param initFormat Optional format override.
 */
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

/**
 * Display CLI usage information.
 */
function help() {
  const msg = `Usage: design-lint [files...]

Commands:
  init                  Create a starter designlint.config.*

Options:
  --init-format <fmt>   Config format for 'init' (js, cjs, mjs, ts, mts, json)
  --config <path>       Path to configuration file
  --format <name|path>  Output format (stylish, json, sarif, or path to module)
  --output <file>       Write report to file
  --report <file>       Write JSON results to file
  --ignore-path <file>  Load additional ignore patterns from file
  --concurrency <n>     Maximum number of files processed concurrently
  --max-warnings <n>    Number of warnings to trigger nonzero exit code
  --quiet               Suppress stdout output
  --no-color            Disable colored output
  --cache               Enable persistent caching
  --cache-location <path>  Path to cache file
  --watch               Watch files and re-lint on changes
  --fix                 Automatically fix problems
  --version             Show version number
  --help                Show this message`;
  console.log(msg);
}

/**
 * Execute the CLI.
 * @param argv Command line arguments.
 * @returns Resolves when processing completes.
 * Side effects: reads and writes files, prints to console, sets process.exitCode.
 */
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
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        config: { type: 'string' },
        format: { type: 'string', default: 'stylish' },
        'init-format': { type: 'string' },
        output: { type: 'string' },
        report: { type: 'string' },
        'ignore-path': { type: 'string' },
        concurrency: { type: 'string' },
        'max-warnings': { type: 'string' },
        quiet: { type: 'boolean', default: false },
        cache: { type: 'boolean', default: false },
        'cache-location': { type: 'string' },
        fix: { type: 'boolean', default: false },
        watch: { type: 'boolean', default: false },
        version: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
        'no-color': { type: 'boolean', default: false },
      },
      allowPositionals: true,
    });

    if (values['no-color']) useColor = false;

    if (values.version) {
      showVersion();
      return;
    }

    if (values.help) {
      help();
      return;
    }

    if (positionals[0] === 'init') {
      initConfig(values['init-format'] as string | undefined);
      return;
    }

    let formatter: Awaited<ReturnType<typeof getFormatter>>;
    try {
      formatter = await getFormatter(values.format as string);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(useColor ? chalk.red(message) : message);
      process.exitCode = 1;
      return;
    }

    const targets = positionals.length ? positionals : ['.'];
    const [{ loadConfig }, { Linter }, { loadIgnore }] = await Promise.all([
      import('../config/loader.js'),
      import('../core/linter.js'),
      import('../core/ignore.js'),
    ]);
    let config = await loadConfig(process.cwd(), values.config);
    if (values.concurrency) {
      const n = Number(values.concurrency);
      if (!Number.isInteger(n) || n <= 0) {
        const message = `Invalid value for --concurrency: "${values.concurrency}". Expected a positive integer.`;
        console.error(useColor ? chalk.red(message) : message);
        process.exitCode = 1;
        return;
      }
      config.concurrency = n;
    }
    let maxWarnings: number | undefined;
    if (values['max-warnings'] !== undefined) {
      const max = Number(values['max-warnings']);
      if (!Number.isInteger(max) || max < 0) {
        const message = `Invalid value for --max-warnings: "${values['max-warnings']}". Expected a non-negative integer.`;
        console.error(useColor ? chalk.red(message) : message);
        process.exitCode = 1;
        return;
      }
      maxWarnings = max;
    }
    if (config.configPath)
      config.configPath = realpathIfExists(config.configPath);
    let pluginPaths = resolvePluginPaths(config);
    let linter = new Linter(config);
    const cache = new Map<string, { mtime: number; result: LintResult }>();
    const cacheLocation = values.cache
      ? path.resolve(
          process.cwd(),
          (values['cache-location'] as string | undefined) ??
            '.designlintcache',
        )
      : undefined;

    let ignorePath: string | undefined;
    if (values['ignore-path']) {
      const resolved = path.resolve(values['ignore-path'] as string);
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

    function resolvePluginPaths(cfg: Config, cacheBust = false): string[] {
      const req = cfg.configPath
        ? createRequire(cfg.configPath)
        : createRequire(import.meta.url);
      const paths: string[] = [];
      for (const p of cfg.plugins || []) {
        try {
          const resolved = realpathIfExists(req.resolve(p));
          if (!fs.existsSync(resolved)) {
            throw new Error(`Plugin not found: "${relFromCwd(resolved)}"`);
          }
          paths.push(
            cacheBust && resolved.endsWith('.mjs')
              ? `${pathToFileURL(resolved).href}?t=${Date.now()}`
              : resolved,
          );
        } catch {
          const resolved = realpathIfExists(path.resolve(p));
          if (!fs.existsSync(resolved)) {
            throw new Error(`Plugin not found: "${relFromCwd(resolved)}"`);
          }
          paths.push(
            cacheBust && resolved.endsWith('.mjs')
              ? `${pathToFileURL(resolved).href}?t=${Date.now()}`
              : resolved,
          );
        }
      }
      return paths;
    }

    let watcher: FSWatcher | null = null;
    let ignoreFilePaths: string[] = [];

    const runLint = async (paths: string[]) => {
      const {
        results,
        ignoreFiles: newIgnore = [],
        warning,
      } = await linter.lintFiles(
        paths,
        values.fix,
        cache,
        ignorePath ? [ignorePath] : [],
        cacheLocation,
      );
      if (warning && !values.quiet) console.warn(warning);
      if (values.watch && watcher) {
        const toAdd = newIgnore.filter((p) => !ignoreFilePaths.includes(p));
        if (toAdd.length) watcher.add(toAdd);
        const toRemove = ignoreFilePaths.filter((p) => !newIgnore.includes(p));
        if (toRemove.length) watcher.unwatch(toRemove);
      }
      ignoreFilePaths = newIgnore;

      const output = formatter(results, useColor);

      if (values.output) {
        await writeFileAtomic(values.output as string, output);
      } else if (!values.quiet) {
        console.log(output);
      }

      if (values.report) {
        await writeFileAtomic(
          values.report as string,
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
    };

    const reportError = (err: unknown) => {
      const output =
        err instanceof Error && err.stack ? err.stack : String(err);
      console.error(useColor ? chalk.red(output) : output);
      process.exitCode = 1;
    };

    await runLint(targets);

    if (values.watch) {
      console.log('Watching for changes...');
      await refreshIgnore();
      const watchPaths = [...targets];
      if (config.configPath) watchPaths.push(config.configPath);
      if (fs.existsSync(designIgnore)) watchPaths.push(designIgnore);
      if (fs.existsSync(gitIgnore)) watchPaths.push(gitIgnore);
      watchPaths.push(
        ...pluginPaths.filter((p) => fs.existsSync(p)),
        ...ignoreFilePaths.filter((p) => fs.existsSync(p)),
      );
      const outputPath = values.output
        ? realpathIfExists(path.resolve(values.output as string))
        : undefined;
      const reportPath = values.report
        ? realpathIfExists(path.resolve(values.report as string))
        : undefined;
      watcher = chokidar.watch(watchPaths, {
        ignored: (p: string) => {
          const rel = relFromCwd(realpathIfExists(p));
          const resolved = realpathIfExists(path.resolve(p));
          if (config.configPath && resolved === config.configPath) return false;
          if (resolved === designIgnore || resolved === gitIgnore) return false;
          if (pluginPaths.includes(resolved)) return false;
          if (ignoreFilePaths.includes(resolved)) return false;
          if (outputPath && resolved === outputPath) return true;
          if (reportPath && resolved === reportPath) return true;
          if (rel === '') return false;
          return ig.ignores(rel);
        },
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
        usePolling: process.platform === 'win32',
        interval: 100,
      });
      watcher.on('error', (err) => reportError(err));
      await once(watcher, 'ready');

      const cleanup = async () => {
        await watcher?.close();
        process.exit(process.exitCode ?? 0);
      };
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);

      const reload = async () => {
        try {
          const req = config.configPath
            ? createRequire(config.configPath)
            : createRequire(import.meta.url);
          for (const p of resolvePluginPaths(config, true))
            delete req.cache?.[p];
          config = await loadConfig(process.cwd(), values.config);
          linter = new Linter(config);
          await refreshIgnore();
          cache.clear();
          if (cacheLocation) {
            try {
              fs.unlinkSync(cacheLocation);
            } catch {}
          }
          const newPluginPaths = resolvePluginPaths(config);
          const toRemove = pluginPaths.filter(
            (p) => !newPluginPaths.includes(p),
          );
          if (toRemove.length) watcher?.unwatch(toRemove);
          const toAdd = newPluginPaths.filter((p) => !pluginPaths.includes(p));
          if (toAdd.length) watcher?.add(toAdd);
          pluginPaths = newPluginPaths;
          await runLint(targets);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!values.quiet) {
            console.error(useColor ? chalk.red(message) : message);
          }
          process.exitCode = 1;
        }
      };

      const handle = async (filePath: string) => {
        const resolved = realpathIfExists(path.resolve(filePath));
        if (outputPath && resolved === outputPath) return;
        if (reportPath && resolved === reportPath) return;
        if (
          (config.configPath && resolved === config.configPath) ||
          resolved === designIgnore ||
          resolved === gitIgnore ||
          pluginPaths.includes(resolved) ||
          ignoreFilePaths.includes(resolved)
        ) {
          await reload();
        } else {
          await runLint([resolved]);
        }
      };

      const handleUnlink = async (filePath: string) => {
        const resolved = realpathIfExists(path.resolve(filePath));
        cache.delete(resolved);
        if (outputPath && resolved === outputPath) return;
        if (reportPath && resolved === reportPath) return;
        if (
          (config.configPath && resolved === config.configPath) ||
          resolved === designIgnore ||
          resolved === gitIgnore ||
          pluginPaths.includes(resolved) ||
          ignoreFilePaths.includes(resolved)
        ) {
          await reload();
        } else {
          await runLint(targets);
        }
      };

      watcher.on('add', (p: string) => handle(p).catch(reportError));
      watcher.on('change', (p: string) => handle(p).catch(reportError));
      watcher.on('unlink', (p: string) => handleUnlink(p).catch(reportError));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(useColor ? chalk.red(message) : message);
    process.exitCode = 1;
  }
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
