import type { LintResult } from '../../core/types.js';

/**
 * Formatter function signature.
 */
export type Formatter = (results: LintResult[], useColor?: boolean) => string;
