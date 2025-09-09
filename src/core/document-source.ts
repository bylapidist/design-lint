import type { Config } from './linter.js';

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
