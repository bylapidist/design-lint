import type { DesignTokens, FlattenedToken } from '../types.js';
import { buildParseTree } from './parse-tree.js';
import { normalizeTokens } from './normalize.js';
import { normalizeColorValues, type ColorSpace } from './normalize-colors.js';
import { validateTokens } from './validate.js';

export type TokenTransform = (tokens: DesignTokens) => DesignTokens;

const tokenTransformRegistry: TokenTransform[] = [];

export function registerTokenTransform(transform: TokenTransform): () => void {
  tokenTransformRegistry.push(transform);
  return () => {
    const idx = tokenTransformRegistry.indexOf(transform);
    if (idx >= 0) tokenTransformRegistry.splice(idx, 1);
  };
}

export { getTokenLocation } from './parse-tree.js';

export interface ParseDesignTokensOptions {
  colorSpace?: ColorSpace;
  transforms?: TokenTransform[];
  onWarn?: (msg: string) => void;
}

export function parseDesignTokens(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
  options?: ParseDesignTokensOptions,
): FlattenedToken[] {
  let transformed = tokens;
  const transforms = [
    ...tokenTransformRegistry,
    ...(options?.transforms ?? []),
  ];
  for (const transform of transforms) {
    transformed = transform(transformed);
  }
  const tree = buildParseTree(transformed, getLoc);
  normalizeTokens(tree, options?.onWarn);
  if (options?.colorSpace) {
    normalizeColorValues(tree, options.colorSpace);
  }
  validateTokens(tree);
  return tree;
}
