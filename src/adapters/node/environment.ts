import type { Environment } from '../../core/environment.js';
import type { Config } from '../../core/linter.js';
import { FileSource } from './file-source.js';
import { NodePluginLoader } from './plugin-loader.js';
import { NodeCacheProvider } from './node-cache-provider.js';
import { DsrTokenProvider } from './dsr-token-provider.js';

export interface DsrOptions {
  /** Path to the Unix domain socket. Defaults to /tmp/designlint-kernel.sock */
  socketPath?: string;
  /** Port for the HTTP fallback transport. Defaults to 7341. */
  httpPort?: number;
  /** Timeout in milliseconds for the initial connection attempt. Defaults to 5000. */
  connectTimeoutMs?: number;
  /**
   * Optional async hook called immediately before the kernel connection is
   * established. Use this to ensure the kernel daemon is running (e.g. auto-
   * launch) without coupling the adapter to CLI-layer imports.
   */
  beforeConnect?: () => Promise<void>;
}

export interface CreateNodeEnvironmentOptions {
  cacheLocation?: string;
  configPath?: string;
  patterns?: string[];
  /**
   * DSR kernel connection options. Required in v8 — the kernel is the only
   * authoritative token source. The caller must ensure the kernel is running
   * before constructing the environment.
   */
  dsr: DsrOptions;
}

/**
 * Construct the Node.js runtime environment for design-lint.
 *
 * In v8 the DSR kernel is the single token source. `options.dsr` is required;
 * callers are responsible for starting the kernel before calling this function.
 */
export function createNodeEnvironment(
  _config: Config,
  options: CreateNodeEnvironmentOptions,
): Environment {
  const { cacheLocation, dsr } = options;

  const tokenProvider = new DsrTokenProvider(async () => {
    if (dsr.beforeConnect) await dsr.beforeConnect();
    const { NodeEnvironment: Env } =
      await import('@lapidist/dsr/environments/node');
    return new Env(dsr);
  });

  return {
    documentSource: new FileSource(),
    pluginLoader: new NodePluginLoader(),
    cacheProvider: cacheLocation
      ? new NodeCacheProvider(cacheLocation)
      : undefined,
    tokenProvider,
  };
}
