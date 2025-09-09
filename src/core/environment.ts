import type { Config } from './linter.js';
import type { DesignTokens } from './types.js';

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
  ): Promise<LintDocument[]>;
}

export interface TokenProvider {
  load(): Promise<DesignTokens>;
}

export interface SourceAdapter {
  scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths?: string[],
  ): Promise<LintDocument[]>;
}

export interface Environment {
  source: SourceAdapter;
  tokenProvider?: TokenProvider;
}
