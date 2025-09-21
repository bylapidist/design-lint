import { append, nil } from '@hyperjump/json-pointer';

const FRAGMENT_PATTERN = /^#(?:|\/.*)$/;

const INVALID_ESCAPE_SEQUENCE = /~(?![01])/;

function decodeFragmentToSegments(fragment: string): string[] {
  if (!FRAGMENT_PATTERN.test(fragment)) {
    throw new Error(`JSON Pointer fragment is invalid: ${fragment}`);
  }

  if (fragment === '#') {
    return [];
  }

  const pointer = fragment.slice(1);
  if (!pointer.startsWith('/')) {
    throw new Error(`JSON Pointer fragment is invalid: ${fragment}`);
  }

  const encodedSegments = pointer.substring(1).split('/');
  const decodedSegments: string[] = [];
  for (const segment of encodedSegments) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new Error(`JSON Pointer fragment is invalid: ${fragment}`);
    }

    if (INVALID_ESCAPE_SEQUENCE.test(decoded)) {
      throw new Error(
        `JSON Pointer fragment contains invalid escape sequence: ${fragment}`,
      );
    }

    decodedSegments.push(decoded.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  return decodedSegments;
}

function encodePointerToken(segment: string): string {
  const pointer = append(segment, nil);
  return pointer.length <= 1 ? '' : pointer.slice(1);
}

function encodeFragmentFromSegments(segments: readonly string[]): string {
  if (segments.length === 0) {
    return '#';
  }

  const encodedSegments = segments.map((segment) =>
    encodeURIComponent(encodePointerToken(segment)),
  );

  return `#/${encodedSegments.join('/')}`;
}

/**
 * Encode a token path segment for use in a JSON Pointer fragment.
 *
 * @param segment - Raw token name.
 * @returns Encoded pointer segment.
 */
export function encodePointerSegment(segment: string): string {
  return encodeURIComponent(encodePointerToken(segment));
}

/**
 * Decode a JSON Pointer fragment segment to its token path representation.
 *
 * @param segment - Encoded pointer fragment.
 * @returns Decoded token path segment.
 */
export function decodePointerSegment(segment: string): string {
  const segments = decodeFragmentToSegments(`#/${segment}`);
  return segments.length === 0 ? '' : segments[0];
}

/**
 * Convert a dot-notation token path into a JSON Pointer reference.
 *
 * @param path - Dot-separated token path.
 * @returns Canonical JSON Pointer string beginning with `#`.
 */
export function pathToPointer(path: string): string {
  const parts = path.split('.').filter((part) => part.length > 0);
  return encodeFragmentFromSegments(parts);
}

/**
 * Convert a JSON Pointer fragment into dot notation when referencing the same document.
 *
 * @param pointer - JSON Pointer string, optionally prefixed by a document URL.
 * @returns Dot-separated token path when the pointer references the current document.
 */
export function pointerToPath(pointer: string): string | undefined {
  if (!FRAGMENT_PATTERN.test(pointer)) {
    return undefined;
  }

  try {
    const segments = decodeFragmentToSegments(pointer);
    return segments.join('.');
  } catch {
    return undefined;
  }
}

/**
 * Encode pointer segments into a canonical JSON Pointer fragment.
 */
export function segmentsToPointer(segments: readonly string[]): string {
  return encodeFragmentFromSegments(segments);
}

/**
 * Extract the JSON Pointer fragment portion from a pointer reference.
 */
export function extractPointerFragment(pointer: string): string | undefined {
  const hashIndex = pointer.indexOf('#');
  if (hashIndex === -1) {
    return undefined;
  }

  const fragment = pointer.slice(hashIndex);
  if (!isPointerFragment(fragment)) {
    return undefined;
  }

  return fragment;
}

/**
 * Determine whether the provided fragment is a valid JSON Pointer fragment.
 */
export function isPointerFragment(fragment: string): boolean {
  try {
    decodeFragmentToSegments(fragment);
    return true;
  } catch {
    return false;
  }
}
