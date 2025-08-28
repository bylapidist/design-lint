#!/usr/bin/env node
import fs from 'fs';
import { parseArgs } from 'node:util';
import path from 'path';
import { loadConfig } from '../config/loader';
import { Linter } from '../core/engine';
import type { LintResult } from '../core/types';
import { getFormatter } from '../formatters';
import chalk from 'chalk';

function showVersion() {
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    version: string;
  };
  // eslint-disable-next-line no-console
  console.log(pkg.version);
}

function initConfig() {
  const configPath = path.resolve(process.cwd(), 'designlint.config.json');
  if (fs.existsSync(configPath)) {
    // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error(useColor ? chalk.red(message) : message);
      process.exitCode = 1;
      return;
    }

    const targets = positionals.length ? positionals : ['.'];
    const config = loadConfig(process.cwd(), values.config);
    const linter = new Linter(config);
    const cache = new Map<string, { mtime: number; result: LintResult }>();

    const runLint = async (paths: string[]) => {
      const results = await linter.lintFiles(paths, values.fix, cache);
      const output = formatter(results, useColor);

      if (values.output) {
        fs.writeFileSync(values.output as string, output, 'utf8');
      } else if (!values.quiet) {
        // eslint-disable-next-line no-console
        console.log(output);
      }

      if (values.report) {
        fs.writeFileSync(
          values.report as string,
          JSON.stringify(results, null, 2),
          'utf8',
        );
      }

      const hasErrors = results.some((r) =>
        r.messages.some((m) => m.severity === 'error'),
      );
      process.exitCode = hasErrors ? 1 : 0;
    };

    await runLint(targets);

    if (values.watch) {
      // eslint-disable-next-line no-console
      console.log('Watching for changes...');
      for (const t of targets) {
        const full = path.resolve(t);
        fs.watch(full, { recursive: true }, async (_event, filename) => {
          if (!filename) return;
          const changed = path.resolve(full, filename);
          await runLint([changed]);
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(useColor ? chalk.red(message) : message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}
