import type { Config } from './linter.js';
import type { PluginLoader } from './plugin-loader.js';
import type { CacheProvider } from './cache-provider.js';
import type { DesignTokens, DtifFlattenedToken } from './types.js';

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
  /** Returns a map of theme → tokens. Values may be raw DTIF documents or
   *  pre-flattened token arrays (e.g. when sourced from the DSR kernel). */
  load(): Promise<Record<string, DesignTokens | readonly DtifFlattenedToken[]>>;
}

export type VariableProvider = TokenProvider;

export interface Environment {
  documentSource: DocumentSource;
  pluginLoader?: PluginLoader;
  cacheProvider?: CacheProvider;
  tokenProvider?: TokenProvider;
}
