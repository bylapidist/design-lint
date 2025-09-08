import type { Config } from './linter.js';

export type LintTarget = string;

export interface DocumentSource {
  scan(
    targets: string[],
    config: Config,
    additionalIgnorePaths?: string[],
  ): Promise<LintTarget[]>;
}
