/**
 * Encode a token path segment for use in a JSON Pointer fragment.
 *
 * @param segment - Raw token name.
 * @returns Encoded pointer segment.
 */
export function encodePointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Decode a JSON Pointer fragment segment to its token path representation.
 *
 * @param segment - Encoded pointer fragment.
 * @returns Decoded token path segment.
 */
export function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Convert a dot-notation token path into a JSON Pointer reference.
 *
 * @param path - Dot-separated token path.
 * @returns Canonical JSON Pointer string beginning with `#`.
 */
export function pathToPointer(path: string): string {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) {
    return '#';
  }
  return `#/${parts.map(encodePointerSegment).join('/')}`;
}

/**
 * Convert a JSON Pointer (possibly with a document prefix) into dot notation.
 *
 * @param pointer - JSON Pointer string, optionally prefixed by a document URL.
 * @returns Dot-separated token path when the pointer references the same document.
 */
export function pointerToPath(pointer: string): string | undefined {
  const hashIndex = pointer.indexOf('#');
  if (hashIndex === -1) {
    return undefined;
  }
  if (hashIndex > 0) {
    return undefined;
  }
  const fragment = pointer.slice(hashIndex + 1);
  if (!fragment || fragment === '') {
    return '';
  }
  if (!fragment.startsWith('/')) {
    return undefined;
  }
  const segments = fragment
    .slice(1)
    .split('/')
    .map((segment) => decodePointerSegment(segment));
  return segments.join('.');
}
