import type { DtifFlattenedToken } from '../../core/types.js';
import { normalizePath, type NameTransform } from './path.js';

/**
 * Derive the normalized token path for a flattened DTIF token.
 *
 * @param token - Token to convert.
 * @param transform - Optional name transform applied to each segment.
 * @returns Normalized dot-delimited path for the token.
 */
export function getTokenPath(
  token: DtifFlattenedToken,
  transform?: NameTransform,
): string {
  const fromPointer = pointerToTokenPath(token.pointer, transform);
  if (fromPointer) {
    return fromPointer;
  }

  if (token.path.length > 0) {
    return normalizePath(joinSegments(token.path), transform);
  }

  if (token.name) {
    return normalizePath(token.name, transform);
  }

  throw new Error(`Unable to derive token path for pointer "${token.pointer}"`);
}

/**
 * Convert a JSON pointer to the normalized dot-delimited token path.
 *
 * @param pointer - Pointer to convert. Accepts strings to support metadata
 * that records replacement pointers outside the canonical DTIF type.
 * Undefined and document root pointers return `undefined` because they do not
 * map to a token path.
 * @param transform - Optional name transform applied to each segment.
 */
export function pointerToTokenPath(
  pointer: string | undefined,
  transform?: NameTransform,
): string | undefined {
  if (!pointer) return undefined;
  const segments = pointerToSegments(pointer);
  if (segments.length === 0) {
    return undefined;
  }
  return normalizePath(joinSegments(segments), transform);
}

function joinSegments(segments: readonly string[]): string {
  return segments.join('.');
}

function pointerToSegments(pointer: string): readonly string[] {
  if (pointer === '#') {
    return [];
  }

  const fragment = pointer.startsWith('#') ? pointer.slice(1) : pointer;
  const trimmed = fragment.startsWith('/') ? fragment.slice(1) : fragment;
  if (!trimmed) {
    return [];
  }

  return trimmed.split('/').map(decodePointerSegment);
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}
