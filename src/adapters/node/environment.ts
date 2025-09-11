import type { Environment } from '../../core/environment';
import type { Config } from '../../core/linter';
import { FileSource } from './file-source';
import { NodePluginLoader } from './plugin-loader';
import { NodeCacheProvider } from './node-cache-provider';
import { NodeTokenProvider } from './token-provider';

export interface CreateNodeEnvironmentOptions {
  cacheLocation?: string;
  configPath?: string;
  patterns?: string[];
}

export function createNodeEnvironment(
  config: Config,
  options: CreateNodeEnvironmentOptions = {},
): Environment {
  const { cacheLocation } = options;
  return {
    documentSource: new FileSource(),
    pluginLoader: new NodePluginLoader(),
    cacheProvider: cacheLocation
      ? new NodeCacheProvider(cacheLocation)
      : undefined,
    tokenProvider: new NodeTokenProvider(config.tokens),
  };
}
