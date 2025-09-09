import type { Config } from './linter.js';
import type { PluginLoader } from './plugin-loader.js';
import type { CacheProvider } from './cache-provider.js';
import type { NormalizedTokens } from './token-utils.js';

export interface LintDocument {
  id: string;
  type: string;
  getText(): Promise<string>;
  metadata?: Record<string, unknown>;
}

export interface DocumentSource {
  scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths?: string[],
  ): Promise<{
    documents: LintDocument[];
    ignoreFiles: string[];
    warning?: string;
  }>;
}

export interface TokenProvider {
  load(): Promise<NormalizedTokens>;
}

export type VariableProvider = TokenProvider;

export interface Environment {
  documentSource: DocumentSource;
  pluginLoader?: PluginLoader;
  cacheProvider?: CacheProvider;
  tokenProvider?: TokenProvider;
}
