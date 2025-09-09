import type { Environment } from '../../core/environment.js';
import type { Config } from '../../core/linter.js';
import { FileSource } from './file-source.js';
import { NodePluginLoader } from './plugin-loader.js';
import { NodeCacheProvider } from './node-cache-provider.js';
import { ConfigTokenProvider } from '../../config/config-token-provider.js';

export interface NodeEnvironmentOptions {
  cacheLocation?: string;
}

export function NodeEnvironment(
  config: Config,
  options: NodeEnvironmentOptions = {},
): Environment {
  const { cacheLocation } = options;
  return {
    documentSource: new FileSource(),
    pluginLoader: new NodePluginLoader(),
    cacheProvider: cacheLocation
      ? new NodeCacheProvider(cacheLocation)
      : undefined,
    tokenProvider: new ConfigTokenProvider(config),
  };
}
