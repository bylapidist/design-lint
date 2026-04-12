import type { Environment } from '../../core/environment.js';
import type { Config } from '../../core/linter.js';
import { FileSource } from './file-source.js';
import { NodePluginLoader } from './plugin-loader.js';
import { NodeCacheProvider } from './node-cache-provider.js';
import { NodeTokenProvider } from './token-provider.js';
import { DsrTokenProvider } from './dsr-token-provider.js';

export interface DsrOptions {
  /** Path to the Unix domain socket. Defaults to /tmp/designlint-kernel.sock */
  socketPath?: string;
  /** Port for the HTTP fallback transport. Defaults to 7341. */
  httpPort?: number;
  /** Timeout in milliseconds for the initial connection attempt. Defaults to 5000. */
  connectTimeoutMs?: number;
}

export interface CreateNodeEnvironmentOptions {
  cacheLocation?: string;
  configPath?: string;
  patterns?: string[];
  /**
   * When set, the environment will attempt to load tokens from a running DSR
   * kernel instead of parsing them locally.
   */
  dsr?: DsrOptions;
}

export function createNodeEnvironment(
  config: Config,
  options: CreateNodeEnvironmentOptions = {},
): Environment {
  const { cacheLocation, dsr } = options;
  const dsrOptions = dsr;
  const tokenProvider = dsrOptions
    ? new DsrTokenProvider(async () => {
        const { NodeEnvironment } =
          await import('@lapidist/dsr/environments/node');
        return new NodeEnvironment(dsrOptions);
      })
    : new NodeTokenProvider(config.tokens);
  return {
    documentSource: new FileSource(),
    pluginLoader: new NodePluginLoader(),
    cacheProvider: cacheLocation
      ? new NodeCacheProvider(cacheLocation)
      : undefined,
    tokenProvider,
  };
}
