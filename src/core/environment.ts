import type { Config } from './linter';
import type { PluginLoader } from './plugin-loader';
import type { CacheProvider } from './cache-provider';
import type { DesignTokens } from './types';

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
  load(): Promise<Record<string, DesignTokens>>;
}

export type VariableProvider = TokenProvider;

export interface Environment {
  documentSource: DocumentSource;
  pluginLoader?: PluginLoader;
  cacheProvider?: CacheProvider;
  tokenProvider?: TokenProvider;
}
