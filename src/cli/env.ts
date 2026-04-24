/**
 * @packageDocumentation
 *
 * Helpers for constructing the CLI's execution environment.
 */

import fs from 'fs';
import path from 'path';
import ignore, { type Ignore } from 'ignore';
import { getFormatter } from '../formatters/index.js';
import type { CacheProvider } from '../core/cache-provider.js';
import type { Config } from '../core/linter.js';
import type { Linter } from '../index.js';
import type { LintResult } from '../core/types.js';
import { createNodeEnvironment } from '../adapters/node/environment.js';
import { relFromCwd, realpathIfExists } from '../adapters/node/utils/paths.js';
import type { DesignLintPolicy } from '../core/types.js';
import { loadPolicy } from '../config/policy-loader.js';
import { enforcePolicy } from '../config/policy-enforcer.js';

/**
 * Represents the prepared environment used by CLI commands.
 *
 * Includes shared configuration, linter instance, cache handles, and ignore
 * file tracking utilities.
 */
export interface Environment {
  /** Format lint results for console output. */
  formatter: (results: LintResult[], useColor?: boolean) => string;
  /** Loaded configuration for the current project. */
  config: Config;
  /** Mutable reference to the active linter instance. */
  linterRef: { current: Linter };
  /** Resolved plugin module paths. */
  pluginPaths: string[];
  /** Optional cache provider instance. */
  cache?: CacheProvider;
  /** Location of the cache file, when enabled. */
  cacheLocation?: string;
  /** Path to a user-specified ignore file. */
  ignorePath?: string;
  /** Resolved path to .designlintignore if present. */
  designIgnore: string;
  /** Resolved path to .gitignore if present. */
  gitIgnore: string;
  refreshIgnore: () => Promise<void>;
  /** Internal state tracking plugin and ignore file paths. */
  state: { pluginPaths: string[]; ignoreFilePaths: string[] };
  /** Retrieve the active ignore matcher. */
  getIg: () => Ignore;
  /** Active policy loaded from `designlint.policy.json`, if present. */
  policy?: DesignLintPolicy;
  /** Options used when creating the environment. */
  envOptions: {
    cacheLocation?: string;
    configPath?: string;
    patterns?: string[];
  };
}

/**
 * Options for preparing the CLI execution environment.
 */
export interface PrepareEnvironmentOptions {
  /** Formatter name or module path. */
  format?: string;
  /** Optional configuration file path. */
  config?: string;
  /** Maximum concurrent linted files. */
  concurrency?: number;
  /** Enable persistent caching. */
  cache?: boolean;
  /** Custom cache file location. */
  cacheLocation?: string;
  /** Additional ignore file path. */
  ignorePath?: string;
  /** File patterns to lint. */
  patterns?: string[];
  /** Path to the DSR kernel Unix socket. Defaults to /tmp/designlint-kernel.sock. */
  kernelSocketPath?: string;
}

/**
 * Prepare the environment for CLI execution by loading configuration, cache,
 * and ignore settings.
 *
 * @param options - Runtime options controlling config, caching, and patterns.
 * @returns Fully prepared environment state.
 */
export async function prepareEnvironment(
  options: PrepareEnvironmentOptions,
): Promise<Environment> {
  const [{ loadConfig }, { createLinter }, { loadIgnore }] = await Promise.all([
    import('../config/loader.js'),
    import('../index.js'),
    import('../core/ignore.js'),
  ]);

  let config = await loadConfig(process.cwd(), options.config);
  const formatter = await getFormatter(
    options.format ?? config.format ?? 'stylish',
  );
  if (options.concurrency !== undefined) {
    config.concurrency = options.concurrency;
  }
  if (config.configPath) {
    config.configPath = realpathIfExists(config.configPath);
  }

  // Enforce designlint.policy.json when present. Static checks (required rules,
  // min severity) throw a ConfigError before any linting begins.
  const policyDir = config.configPath
    ? path.dirname(config.configPath)
    : process.cwd();
  const policy = loadPolicy(policyDir);
  if (policy !== undefined) {
    enforcePolicy(config, policy);
  }
  // `policy` is retained and returned so the execute layer can apply runtime
  // enforcement (tokenCoverage, ratchet, agentPolicy) after the lint run.

  const cacheLocation = options.cache
    ? path.resolve(process.cwd(), options.cacheLocation ?? '.designlintcache')
    : undefined;

  const socketPath = options.kernelSocketPath ?? '/tmp/designlint-kernel.sock';

  // In v8, the DSR kernel is the only token source. Auto-launch is deferred to
  // the first token request so that commands that resolve no files (e.g. an
  // empty glob) exit cleanly without requiring a running kernel.
  const beforeConnect = async () => {
    if (!fs.existsSync(socketPath)) {
      const { kernelStart } = await import('./kernel.js');
      // Write to stderr so kernel startup messages don't corrupt stdout (e.g. JSON formatter output)
      process.stderr.write(
        `[design-lint] Starting DSR kernel (socket: ${socketPath})...\n`,
      );
      kernelStart({ socketPath, configPath: config.configPath, quiet: true });
      if (!fs.existsSync(socketPath)) {
        throw new Error(
          `DSR kernel failed to start (socket not found at ${socketPath}). ` +
            "Run 'design-lint kernel start' manually and check system logs.",
        );
      }
    }
  };

  const env = createNodeEnvironment(config, {
    cacheLocation,
    configPath: config.configPath,
    patterns: options.patterns,
    dsr: { socketPath, beforeConnect },
  });
  const cache = env.cacheProvider;
  const linterRef = {
    current: createLinter(config, env),
  };
  const pluginPaths = await linterRef.current.getPluginPaths();

  let ignorePath: string | undefined;
  if (options.ignorePath) {
    const resolved = path.resolve(options.ignorePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Ignore file not found: "${relFromCwd(resolved)}"`);
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

  const state: Environment['state'] = { pluginPaths, ignoreFilePaths: [] };

  return {
    formatter,
    config,
    linterRef,
    pluginPaths,
    cache,
    cacheLocation,
    ignorePath,
    designIgnore,
    gitIgnore,
    refreshIgnore,
    state,
    policy,
    getIg: () => ig,
    envOptions: {
      cacheLocation,
      configPath: config.configPath,
      patterns: options.patterns,
    },
  };
}
