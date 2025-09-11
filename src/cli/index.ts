#!/usr/bin/env node
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk, { supportsColor } from 'chalk';
import { TokenParseError } from '../adapters/node/token-parser';
import { isRecord } from '../utils/is-record';
import { prepareEnvironment, type PrepareEnvironmentOptions } from './env';
import { executeLint, type ExecuteOptions } from './execute';
import { watchMode } from './watch';
import { initConfig } from './init-config';
import { exportTokens } from './tokens';

type CliOptions = ExecuteOptions &
  PrepareEnvironmentOptions & {
    color?: boolean;
    watch?: boolean;
  };

function hasVersion(value: unknown): value is { version: string } {
  return isRecord(value) && typeof value.version === 'string';
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
    .action((opts: { initFormat?: string }) => {
      initConfig(opts.initFormat);
    });

  program
    .command('tokens')
    .description('Export flattened design tokens as JSON')
    .option('--theme <name>', 'Theme name to export')
    .option('--out <file>', 'Write tokens to file')
    .option('--config <path>', 'Path to configuration file')
    .action(
      async (
        opts: { theme?: string; out?: string; config?: string },
        cmd: Command,
      ) => {
        const parent = cmd.parent?.opts<{ config?: string }>() ?? {};
        await exportTokens({
          ...opts,
          config: opts.config ?? parent.config,
        });
      },
    );
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
  const pkgRaw: unknown = JSON.parse(pkgData);
  if (!hasVersion(pkgRaw)) {
    throw new Error('Invalid package.json');
  }
  const pkg = pkgRaw;

  const program = createProgram(pkg.version);

  program.action(async (files: string[], options: CliOptions) => {
    if (options.color === false) useColor = false;
    const patterns = files.length ? files : ['.'];
    try {
      const env = await prepareEnvironment({ ...options, patterns });
      const services = { ...env, useColor };
      const { exitCode } = await executeLint(patterns, options, services);
      process.exitCode = exitCode;
      if (options.watch) await watchMode(patterns, options, services);
    } catch (err) {
      if (err instanceof TokenParseError) {
        const out = err.format();
        console.error(useColor ? chalk.red(out) : out);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        console.error(useColor ? chalk.red(message) : message);
      }
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
