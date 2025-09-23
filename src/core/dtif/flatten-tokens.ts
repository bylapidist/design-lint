import { splitJsonPointer } from '@lapidist/dtif-parser';
import type { FlattenedToken, ResolvedTokenView } from '../types.js';
import type { DtifJsonPointer, DtifSourceLocation } from './session.js';

const tokenLocations = new Map<string, { line: number; column: number }>();

export function pointerToPath(pointer: DtifJsonPointer): string {
  const segments = splitJsonPointer(pointer);
  if (segments.length === 0) return '';
  return segments.join('.');
}

export function pointerListToPaths(
  pointers?: readonly DtifJsonPointer[],
): string[] | undefined {
  if (!pointers || pointers.length === 0) return undefined;
  return pointers.map((pointer) => pointerToPath(pointer));
}

export function toLegacyLocation(location?: DtifSourceLocation): {
  line: number;
  column: number;
} {
  if (!location) {
    return { line: 1, column: 1 };
  }
  return { line: location.start.line, column: location.start.column };
}

export function flattenResolvedTokens(
  tokens: readonly ResolvedTokenView[],
): FlattenedToken[] {
  tokenLocations.clear();
  return tokens.map((token) => {
    const path = pointerToPath(token.pointer);
    const loc = toLegacyLocation(token.metadata.source);
    tokenLocations.set(path, loc);
    return {
      path,
      value: token.value,
      type: token.type,
      aliases: pointerListToPaths(token.aliases),
      metadata: {
        description: token.metadata.description,
        extensions: token.metadata.extensions,
        deprecated: token.metadata.deprecated,
        loc,
      },
    } satisfies FlattenedToken;
  });
}

export function getFlattenedTokenLocation(
  path: string,
): { line: number; column: number } | undefined {
  return tokenLocations.get(path);
}
