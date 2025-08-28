#!/usr/bin/env node
import fs from 'fs';
import { parseArgs } from 'node:util';
import path from 'path';
import { loadConfig } from '../config/loader';
import { Linter } from '../core/engine';
import { getFormatter } from '../formatters';

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
  --quiet             Suppress stdout output
  --fix               Automatically fix problems
  --version           Show version number
  --help              Show this message`;
  // eslint-disable-next-line no-console
  console.log(msg);
}

export async function run(argv = process.argv.slice(2)) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: {
        config: { type: 'string' },
        format: { type: 'string', default: 'stylish' },
        output: { type: 'string' },
        quiet: { type: 'boolean', default: false },
        fix: { type: 'boolean', default: false },
        version: { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
      allowPositionals: true,
    });

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

    let formatter;
    try {
      formatter = getFormatter(values.format as string);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(message);
      process.exitCode = 1;
      return;
    }

    const targets = positionals.length ? positionals : ['.'];
    const config = loadConfig(process.cwd(), values.config);
    const linter = new Linter(config);
    const results = await linter.lintFiles(targets, values.fix);
    const output = formatter(results);

    if (values.output) {
      fs.writeFileSync(values.output as string, output, 'utf8');
    } else if (!values.quiet) {
      // eslint-disable-next-line no-console
      console.log(output);
    }

    const hasErrors = results.some((r) =>
      r.messages.some((m) => m.severity === 'error'),
    );
    if (hasErrors) process.exitCode = 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}
