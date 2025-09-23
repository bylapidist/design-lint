import type { LegacyDesignTokens, FlattenedToken } from '../types.js';
import { buildParseTree } from './parse-tree.js';
import { normalizeTokens } from './normalize.js';
import { normalizeColorValues, type ColorSpace } from './normalize-colors.js';
import { validateTokens } from './validate.js';

export { getTokenLocation } from './parse-tree.js';

export interface ParseDesignTokensOptions {
  colorSpace?: ColorSpace;
  onWarn?: (msg: string) => void;
}

export function parseDesignTokens(
  tokens: LegacyDesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
  options?: ParseDesignTokensOptions,
): FlattenedToken[] {
  const tree = buildParseTree(tokens, getLoc, options?.onWarn);
  normalizeTokens(tree, options?.onWarn);
  if (options?.colorSpace) {
    normalizeColorValues(tree, options.colorSpace);
  }
  validateTokens(tree);
  return tree;
}
