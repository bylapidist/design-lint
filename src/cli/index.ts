#!/usr/bin/env node
/**
 * @packageDocumentation
 *
 * Command-line interface entry point for design-lint.
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { supportsColor } from 'chalk';
import { DtifTokenParseError } from '../adapters/node/token-parser.js';
import { guards } from '../utils/index.js';

const {
  data: { isRecord },
} = guards;
import { prepareEnvironment, type PrepareEnvironmentOptions } from './env.js';
import { executeLint, type ExecuteOptions } from './execute.js';
import { watchMode } from './watch.js';
import { initConfig } from './init-config.js';
import { exportTokens } from './tokens.js';
import { validateConfig } from './validate-config.js';
import { createLogger, type Logger } from './logger.js';

type CliOptions = ExecuteOptions &
  PrepareEnvironmentOptions & {
    color?: boolean;
    watch?: boolean;
  };

function hasVersion(value: unknown): value is { version: string } {
  return isRecord(value) && typeof value.version === 'string';
}

/**
 * Configure the CLI program with global options and subcommands.
 *
 * @param version - Package version for display in `--version` output.
 * @param logger - Logger used for error reporting in command handlers.
 * @returns Configured commander instance.
 */
function createProgram(version: string, logger: Logger) {
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
    .option(
      '--fail-on-empty',
      'Exit with code 1 when no files match the provided targets',
    )
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
      try {
        initConfig(opts.initFormat);
      } catch (err) {
        logger.error(err);
      }
    });

  program
    .command('validate')
    .description('Validate configuration and tokens')
    .option('--config <path>', 'Path to configuration file')
    .action(async (opts: { config?: string }, cmd: Command) => {
      try {
        const parent = cmd.parent?.opts<{ config?: string }>() ?? {};
        await validateConfig({ config: opts.config ?? parent.config }, logger);
      } catch (err) {
        logger.error(err);
      }
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
        try {
          const parent = cmd.parent?.opts<{ config?: string }>() ?? {};
          await exportTokens({
            ...opts,
            config: opts.config ?? parent.config,
          });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  return program;
}

/**
 * Entry point for the design-lint CLI.
 *
 * Parses command-line arguments, initializes the program, and executes the
 * lint or subcommand workflows.
 *
 * @param argv - Command-line arguments excluding the node and script path.
 */
export async function run(argv = process.argv.slice(2)): Promise<void> {
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

  const logger = createLogger(() => useColor);
  const program = createProgram(pkg.version, logger);

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
      logger.error(err instanceof DtifTokenParseError ? err.format() : err);
    }
  });

  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (err) {
    logger.error(err);
  }
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
