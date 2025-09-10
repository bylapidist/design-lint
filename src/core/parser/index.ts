import type { DesignTokens, FlattenedToken } from '../types.js';
import { buildParseTree } from './parse-tree.js';
import { normalizeTokens } from './normalize.js';
import { validateTokens } from './validate.js';

export function parseDesignTokens(tokens: DesignTokens): FlattenedToken[] {
  const tree = buildParseTree(tokens);
  normalizeTokens(tree);
  validateTokens(tree);
  return tree;
}
