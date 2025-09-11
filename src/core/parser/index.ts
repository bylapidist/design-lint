import type { DesignTokens, FlattenedToken } from '../types';
import { buildParseTree } from './parse-tree';
import { normalizeTokens } from './normalize';
import { normalizeColorValues, type ColorSpace } from './normalize-colors';
import { validateTokens } from './validate';

export type TokenTransform = (tokens: DesignTokens) => DesignTokens;

const tokenTransformRegistry: TokenTransform[] = [];

export function registerTokenTransform(transform: TokenTransform): () => void {
  tokenTransformRegistry.push(transform);
  return () => {
    const idx = tokenTransformRegistry.indexOf(transform);
    if (idx >= 0) tokenTransformRegistry.splice(idx, 1);
  };
}

export { getTokenLocation } from './parse-tree';

export interface ParseDesignTokensOptions {
  colorSpace?: ColorSpace;
  transforms?: TokenTransform[];
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
  normalizeTokens(tree);
  if (options?.colorSpace) {
    normalizeColorValues(tree, options.colorSpace);
  }
  validateTokens(tree);
  return tree;
}
