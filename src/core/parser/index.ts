import type { DesignTokens, FlattenedToken } from '../types.js';
import { buildParseTree } from './parse-tree.js';
import { normalizeTokens } from './normalize.js';
import { normalizeColorValues, type ColorSpace } from './normalize-colors.js';
import { validateTokens } from './validate.js';

export { getTokenLocation } from './parse-tree.js';

export interface ParseDesignTokensOptions {
  colorSpace?: ColorSpace;
}

export function parseDesignTokens(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
  options?: ParseDesignTokensOptions,
): FlattenedToken[] {
  const tree = buildParseTree(tokens, getLoc);
  normalizeTokens(tree);
  if (options?.colorSpace) {
    normalizeColorValues(tree, options.colorSpace);
  }
  validateTokens(tree);
  return tree;
}
