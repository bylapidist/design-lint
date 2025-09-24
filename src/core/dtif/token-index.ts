import type { DtifFlattenedToken, JsonPointer } from '../types.js';
import { normalizePath, type NameTransform } from '../../utils/tokens/path.js';

export function indexDtifTokens(
  tokens: readonly DtifFlattenedToken[],
): Map<JsonPointer, DtifFlattenedToken> {
  const map = new Map<JsonPointer, DtifFlattenedToken>();
  for (const token of tokens) {
    map.set(token.pointer, token);
  }
  return map;
}

export function createDtifNameIndex(
  tokens: readonly DtifFlattenedToken[],
  transform?: NameTransform,
): Map<string, DtifFlattenedToken> {
  const map = new Map<string, DtifFlattenedToken>();
  for (const token of tokens) {
    const name = pointerSegmentsToName(token.path, transform);
    map.set(name, token);
  }
  return map;
}

export function pointerSegmentsToName(
  segments: readonly string[],
  transform?: NameTransform,
): string {
  const path = segments.join('.');
  return normalizePath(path, transform);
}
