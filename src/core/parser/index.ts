import type { DesignTokens, FlattenedToken } from '../types.js';
import { buildParseTree } from './parse-tree.js';
import { normalizeTokens } from './normalize.js';
import { validateTokens } from './validate.js';

export { getTokenLocation } from './parse-tree.js';

export function parseDesignTokens(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
): FlattenedToken[] {
  const tree = buildParseTree(tokens, getLoc);
  normalizeTokens(tree);
  validateTokens(tree);
  return tree;
}
