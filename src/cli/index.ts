#!/usr/bin/env node
import fs from 'fs';
import { parseArgs } from 'node:util';
import path from 'path';
import { createRequire } from 'module';
import { once } from 'node:events';
import type { LintResult } from '../core/types';
import type { Config } from '../core/engine';
import { getFormatter } from '../formatters/index.js';
import chalk from 'chalk';
import ignore from 'ignore';
import chokidar, { FSWatcher } from 'chokidar';
import { relFromCwd, realpathIfExists } from '../utils/paths';
import { writeFileAtomicSync } from '../utils/atomicWrite';

function showVersion() {
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    version: string;
  };
  console.log(pkg.version);
}

function initConfig() {
  const configPath = path.resolve(process.cwd(), 'designlint.config.json');
  if (fs.existsSync(configPath)) {
    console.log('designlint.config.json already exists');
    return;
  }
  const defaultConfig = {
    tokens: {},
    rules: {},
  };
  fs.writeFileSync(
    configPath,
    `${JSON.stringify(defaultConfig, null, 2)}\n`,
    'utf8',
  );
  console.log('Created designlint.config.json');
}

function help() {
  const msg = `Usage: design-lint [files...]

Commands:
  init                Create a starter designlint.config.json

Options:
  --config <path>     Path to configuration file
  --format <name>     Output format (stylish, json, sarif)
  --output <file>     Write report to file
  --report <file>     Write JSON results to file
  --quiet             Suppress stdout output
  --no-color          Disable colored output
  --watch             Watch files and re-lint on changes
  --fix               Automatically fix problems
  --version           Show version number
  --help              Show this message`;
  console.log(msg);
}

export async function run(argv = process.argv.slice(2)) {
  let useColor = true;
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        config: { type: 'string' },
        format: { type: 'string', default: 'stylish' },
        output: { type: 'string' },
        report: { type: 'string' },
        quiet: { type: 'boolean', default: false },
        fix: { type: 'boolean', default: false },
        watch: { type: 'boolean', default: false },
        version: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
        'no-color': { type: 'boolean', default: false },
      },
      allowPositionals: true,
    });

    useColor = !values['no-color'];

    if (values.version) {
      showVersion();
      return;
    }

    if (values.help) {
      help();
      return;
    }

    if (positionals[0] === 'init') {
      initConfig();
      return;
    }

    let formatter: ReturnType<typeof getFormatter>;
    try {
      formatter = getFormatter(values.format as string);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(useColor ? chalk.red(message) : message);
      process.exitCode = 1;
      return;
    }

    const targets = positionals.length ? positionals : ['.'];
    const [{ loadConfig }, { Linter }, { loadIgnore }] = await Promise.all([
      import('../config/loader.js'),
      import('../core/engine.js'),
      import('../core/ignore.js'),
    ]);
    let config = await loadConfig(process.cwd(), values.config);
    if (config.configPath)
      config.configPath = realpathIfExists(config.configPath);
    let linter = new Linter(config);
    const cache = new Map<string, { mtime: number; result: LintResult }>();

    const gitIgnore = realpathIfExists(path.join(process.cwd(), '.gitignore'));
    const designIgnore = realpathIfExists(
      path.join(process.cwd(), '.designlintignore'),
    );
    let ig = ignore();

    const refreshIgnore = async () => {
      const { ig: newIg } = await loadIgnore(config);
      ig = newIg;
    };

    const resolvePluginPaths = (cfg: Config): string[] => {
      const req = cfg.configPath ? createRequire(cfg.configPath) : require;
      const paths: string[] = [];
      for (const p of cfg.plugins || []) {
        try {
          paths.push(realpathIfExists(req.resolve(p)));
        } catch {
          paths.push(realpathIfExists(path.resolve(p)));
        }
      }
      return paths;
    };

    let watcher: FSWatcher | null = null;
    let ignoreFilePaths: string[] = [];

    const runLint = async (paths: string[]) => {
      const results = await linter.lintFiles(paths, values.fix, cache);
      const newIgnore = results.ignoreFiles ?? [];
      if (values.watch && watcher) {
        const toAdd = newIgnore.filter((p) => !ignoreFilePaths.includes(p));
        if (toAdd.length) watcher.add(toAdd);
        const toRemove = ignoreFilePaths.filter((p) => !newIgnore.includes(p));
        if (toRemove.length) watcher.unwatch(toRemove);
      }
      ignoreFilePaths = newIgnore;

      const output = formatter(results, useColor);

      if (values.output) {
        writeFileAtomicSync(values.output as string, output);
      } else if (!values.quiet) {
        console.log(output);
      }

      if (values.report) {
        writeFileAtomicSync(
          values.report as string,
          JSON.stringify(results, null, 2),
        );
      }

      const hasErrors = results.some((r) =>
        r.messages.some((m) => m.severity === 'error'),
      );
      process.exitCode = hasErrors ? 1 : 0;
    };

    const reportError = (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(useColor ? chalk.red(message) : message);
      process.exitCode = 1;
    };

    await runLint(targets);

    if (values.watch) {
      console.log('Watching for changes...');
      await refreshIgnore();
      let pluginPaths = resolvePluginPaths(config);
      const watchPaths = [...targets];
      if (config.configPath) watchPaths.push(config.configPath);
      watchPaths.push(
        designIgnore,
        gitIgnore,
        ...pluginPaths,
        ...ignoreFilePaths,
      );
      watcher = chokidar.watch(watchPaths, {
        ignored: (p: string) => {
          const rel = relFromCwd(realpathIfExists(p));
          const resolved = realpathIfExists(path.resolve(p));
          if (config.configPath && resolved === config.configPath) return false;
          if (resolved === designIgnore || resolved === gitIgnore) return false;
          if (pluginPaths.includes(resolved)) return false;
          if (ignoreFilePaths.includes(resolved)) return false;
          return ig.ignores(rel);
        },
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
        usePolling: process.platform === 'win32',
        interval: 100,
      });
      await once(watcher, 'ready');

      const cleanup = async () => {
        await watcher?.close();
        process.exit(process.exitCode ?? 0);
      };
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);

      const reload = async () => {
        const req = config.configPath
          ? createRequire(config.configPath)
          : require;
        for (const p of pluginPaths) delete req.cache?.[p];
        config = await loadConfig(process.cwd(), values.config);
        linter = new Linter(config);
        await refreshIgnore();
        cache.clear();
        const newPluginPaths = resolvePluginPaths(config);
        const toRemove = pluginPaths.filter((p) => !newPluginPaths.includes(p));
        if (toRemove.length) watcher?.unwatch(toRemove);
        const toAdd = newPluginPaths.filter((p) => !pluginPaths.includes(p));
        if (toAdd.length) watcher?.add(toAdd);
        pluginPaths = newPluginPaths;
        await runLint(targets);
      };

      const handle = async (filePath: string) => {
        const resolved = realpathIfExists(path.resolve(filePath));
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

if (require.main === module) {
  run();
}
