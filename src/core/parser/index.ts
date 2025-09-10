import type { DesignTokens, FlattenedToken } from '../types.js';
import { buildParseTree } from './parse-tree.js';
import { normalizeTokens } from './normalize.js';
import { validateTokens } from './validate.js';
import { figmaToDTCG } from '../formats/figma.js';
import { tokensStudioToDTCG } from '../formats/tokens-studio.js';

export { getTokenLocation } from './parse-tree.js';

export function parseDesignTokens(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
): FlattenedToken[] {
  const transforms = [figmaToDTCG, tokensStudioToDTCG];
  let normalized: DesignTokens = tokens;
  for (const transform of transforms) {
    const result = transform(normalized);
    if (result) {
      normalized = result;
      break;
    }
  }
  const tree = buildParseTree(normalized, getLoc);
  normalizeTokens(tree);
  validateTokens(tree);
  return tree;
}
