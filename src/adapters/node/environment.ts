import type { Environment } from '../../core/environment.js';
import type { Config } from '../../core/linter.js';
import { FileSource } from './file-source.js';
import { NodePluginLoader } from './plugin-loader.js';
import { NodeCacheProvider } from './node-cache-provider.js';
import { NodeTokenProvider } from './token-provider.js';

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
    tokenProvider: new NodeTokenProvider(
      config.tokens,
      config.wrapTokensWithVar,
    ),
  };
}

// Backward compatibility for previous name
export const NodeEnvironment = createNodeEnvironment;
