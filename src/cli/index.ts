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
import { generateDocs } from './docs.js';
import { migrateConfig } from './migrate.js';
import { exportDesignSystemMd } from './export-design-system-md.js';
import { kernelStart, kernelStop, kernelStatus } from './kernel.js';
import { exportRuntimeSnapshot } from './snapshot.js';
import { diffSnapshots } from './diff.js';
import {
  tokenAdd,
  tokenDeprecate,
  componentRegister,
  ruleConfigure,
} from './write.js';
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

  program
    .command('docs')
    .description('Generate a documentation site for tokens and rules')
    .option(
      '--out <dir>',
      'Output directory for generated docs',
      'docs/design-system',
    )
    .option(
      '--site-format <name>',
      "Output format: 'vitepress' (default) or 'markdown'",
      'vitepress',
    )
    .option('--config <path>', 'Path to configuration file')
    .action(
      async (
        opts: { out?: string; siteFormat?: string; config?: string },
        cmd: Command,
      ) => {
        try {
          const parent = cmd.parent?.opts<{ config?: string }>() ?? {};
          await generateDocs({
            out: opts.out,
            format: opts.siteFormat === 'markdown' ? 'markdown' : 'vitepress',
            config: opts.config ?? parent.config,
          });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  program
    .command('export-design-system-md')
    .description('Generate DESIGN_SYSTEM.md for AI agent consumption (DSCP v1)')
    .option('--out <file>', 'Output file path', 'DESIGN_SYSTEM.md')
    .option('--config <path>', 'Path to configuration file')
    .option(
      '--lint',
      'Run a lint pass and populate the violations section',
      false,
    )
    .action(
      async (
        opts: { out?: string; config?: string; lint?: boolean },
        cmd: Command,
      ) => {
        try {
          const parent = cmd.parent?.opts<{ config?: string }>() ?? {};
          await exportDesignSystemMd({
            out: opts.out,
            config: opts.config ?? parent.config,
            lint: opts.lint,
          });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  program
    .command('migrate')
    .description('Codemod v7 config shapes to v8 format')
    .option('--config <path>', 'Path to config file to migrate')
    .option('--out <path>', 'Write migrated config to a new file')
    .option('--dry-run', 'Print changes without writing files')
    .action((opts: { config?: string; out?: string; dryRun?: boolean }) => {
      try {
        migrateConfig({
          config: opts.config,
          out: opts.out,
          dryRun: opts.dryRun,
        });
      } catch (err) {
        logger.error(err);
      }
    });

  // ---------------------------------------------------------------------------
  // Kernel lifecycle commands
  // ---------------------------------------------------------------------------

  const kernel = program
    .command('kernel')
    .description('Manage the DSR kernel daemon');

  kernel
    .command('start')
    .description('Start the DSR kernel daemon in the background')
    .option('--socket-path <path>', 'Unix socket path for the kernel')
    .option('--http-port <n>', 'HTTP fallback port', (v) => parseInt(v, 10))
    .option('--pid-file <path>', 'Path to the PID file')
    .option('--no-http', 'Disable HTTP fallback transport')
    .action(
      (opts: {
        socketPath?: string;
        httpPort?: number;
        pidFile?: string;
        http?: boolean;
      }) => {
        try {
          kernelStart({
            socketPath: opts.socketPath,
            httpPort: opts.httpPort,
            pidFile: opts.pidFile,
            noHttp: opts.http === false,
          });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  kernel
    .command('stop')
    .description('Stop the running DSR kernel daemon')
    .option('--pid-file <path>', 'Path to the PID file')
    .action((opts: { pidFile?: string }) => {
      try {
        kernelStop({ pidFile: opts.pidFile });
      } catch (err) {
        logger.error(err);
      }
    });

  kernel
    .command('status')
    .description('Print the current kernel status')
    .option('--pid-file <path>', 'Path to the PID file')
    .action((opts: { pidFile?: string }) => {
      try {
        kernelStatus({ pidFile: opts.pidFile });
      } catch (err) {
        logger.error(err);
      }
    });

  program
    .command('export-runtime-snapshot')
    .description('Export a binary DSR kernel snapshot to a file')
    .option(
      '--out <path>',
      'Output path for the snapshot',
      '.designlint/snapshot.bin',
    )
    .option('--socket-path <path>', 'Unix socket path for the kernel')
    .option('--http-port <n>', 'HTTP fallback port', (v) => parseInt(v, 10))
    .action(
      async (opts: {
        out?: string;
        socketPath?: string;
        httpPort?: number;
      }) => {
        try {
          await exportRuntimeSnapshot({
            out: opts.out,
            socketPath: opts.socketPath,
            httpPort: opts.httpPort,
          });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  // ---------------------------------------------------------------------------
  // token write commands
  // ---------------------------------------------------------------------------

  const token = program
    .command('token')
    .description('Design token write operations (requires a running kernel)');

  token
    .command('add <pointer>')
    .description('Register a new design token in the running DSR kernel')
    .requiredOption('--name <name>', 'Human-readable token name')
    .option('--type <type>', 'DTIF token type (e.g. color, dimension)')
    .option('--value <json>', 'Token value as a JSON string')
    .option('--socket-path <path>', 'Unix socket path for the kernel')
    .option('--http-port <n>', 'HTTP fallback port', (v: string) =>
      parseInt(v, 10),
    )
    .action(
      async (
        pointer: string,
        opts: {
          name: string;
          type?: string;
          value?: string;
          socketPath?: string;
          httpPort?: number;
        },
      ) => {
        try {
          await tokenAdd({ pointer, ...opts });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  token
    .command('deprecate <pointer>')
    .description('Mark a design token as deprecated in the running DSR kernel')
    .option('--replacement <pointer>', 'Replacement token pointer')
    .option('--socket-path <path>', 'Unix socket path for the kernel')
    .option('--http-port <n>', 'HTTP fallback port', (v: string) =>
      parseInt(v, 10),
    )
    .action(
      async (
        pointer: string,
        opts: {
          replacement?: string;
          socketPath?: string;
          httpPort?: number;
        },
      ) => {
        try {
          await tokenDeprecate({ pointer, ...opts });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  // ---------------------------------------------------------------------------
  // component write commands
  // ---------------------------------------------------------------------------

  const component = program
    .command('component')
    .description(
      'Component registry write operations (requires a running kernel)',
    );

  component
    .command('register <name>')
    .description('Register a component in the running DSR kernel')
    .requiredOption('--package <name>', 'Package that exports this component')
    .option('--version <semver>', 'Package version')
    .option(
      '--replaces <names>',
      'Comma-separated list of component names this replaces',
    )
    .option('--socket-path <path>', 'Unix socket path for the kernel')
    .option('--http-port <n>', 'HTTP fallback port', (v: string) =>
      parseInt(v, 10),
    )
    .action(
      async (
        name: string,
        opts: {
          package: string;
          version?: string;
          replaces?: string;
          socketPath?: string;
          httpPort?: number;
        },
      ) => {
        try {
          await componentRegister({
            name,
            packageName: opts.package,
            version: opts.version,
            replaces: opts.replaces,
            socketPath: opts.socketPath,
            httpPort: opts.httpPort,
          });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  // ---------------------------------------------------------------------------
  // rule write commands
  // ---------------------------------------------------------------------------

  const rule = program
    .command('rule')
    .description(
      'Rule configuration write operations (requires a running kernel)',
    );

  rule
    .command('configure <ruleId>')
    .description('Update a rule severity or options in the running DSR kernel')
    .option('--severity <level>', 'Rule severity: error, warn, or off')
    .option('--options <json>', 'Rule options as a JSON string')
    .option('--socket-path <path>', 'Unix socket path for the kernel')
    .option('--http-port <n>', 'HTTP fallback port', (v: string) =>
      parseInt(v, 10),
    )
    .action(
      async (
        ruleId: string,
        opts: {
          severity?: string;
          options?: string;
          socketPath?: string;
          httpPort?: number;
        },
      ) => {
        try {
          await ruleConfigure({ ruleId, ...opts });
        } catch (err) {
          logger.error(err);
        }
      },
    );

  program
    .command('diff')
    .description('Compare two DSR kernel snapshots')
    .argument('<snapshot-a>', 'First (before) snapshot file')
    .argument('<snapshot-b>', 'Second (after) snapshot file')
    .option('--format <name>', 'Output format: text (default) or json', 'text')
    .action(
      async (
        snapshotA: string,
        snapshotB: string,
        opts: { format?: string },
      ) => {
        try {
          await diffSnapshots({
            snapshotA,
            snapshotB,
            format: opts.format === 'json' ? 'json' : 'text',
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

  // Modules loaded at startup (chokidar, flat-cache, etc.) can leave open
  // libuv handles on Linux that prevent natural process exit. Watch mode keeps
  // the event loop alive intentionally via chokidar; all other commands must
  // exit explicitly so spawned child processes (e.g. in tests) close promptly.
  const opts = program.opts<{ watch?: boolean }>();
  if (!opts.watch) {
    process.exit(process.exitCode ?? 0);
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
