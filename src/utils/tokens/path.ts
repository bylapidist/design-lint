/**
 * @packageDocumentation
 *
 * Utilities for normalizing design token paths and applying name transforms.
 */

import { JsonPointer } from 'jsonpointerx';

export type NameTransform = 'kebab-case' | 'camelCase' | 'PascalCase';

/** @internal */
function transformSegment(seg: string, transform?: NameTransform): string {
  if (!transform) return seg;
  switch (transform) {
    case 'kebab-case':
      return seg
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase();
    case 'camelCase':
      return seg
        .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ''))
        .replace(/^[A-Z]/, (s) => s.toLowerCase());
    case 'PascalCase':
      return seg
        .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ''))
        .replace(/^[a-z]/, (s) => s.toUpperCase());
    default:
      return seg;
  }
}

function encodePointer(segments: (string | number)[]): string {
  if (segments.length === 0) {
    return '';
  }
  return new JsonPointer(segments.map((segment) => String(segment))).toString();
}

/**
 * Split a token path expressed in dot notation or JSON Pointer syntax into segments.
 *
 * @param path - Token path to segment.
 * @returns Array of unescaped pointer segments.
 */
export function getPathSegments(path: string): string[] {
  if (path.length === 0 || path === '/' || path === '#') {
    return [];
  }
  if (path.startsWith('/')) {
    return JsonPointer.compile(path).segments;
  }
  if (path.startsWith('#')) {
    return JsonPointer.compile(path).segments;
  }
  return path.split('.').filter(Boolean);
}

/**
 * Retrieve the first segment from a token path, if present.
 *
 * @param path - Token path expressed as JSON Pointer or dot notation.
 * @returns Leading path segment or `undefined` when the path is empty.
 */
export function getPathRoot(path: string): string | undefined {
  const [root] = getPathSegments(path);
  return root;
}

/**
 * Normalize a token path to a canonical JSON Pointer string with optional case transforms.
 *
 * @param path - Original token path using JSON Pointer or dot notation.
 * @param transform - Optional casing applied to each path segment.
 * @returns Canonical JSON Pointer string representing the provided path.
 */
export function normalizePath(path: string, transform?: NameTransform): string {
  const segments = getPathSegments(path);
  const transformed = segments.map((segment) =>
    transformSegment(segment, transform),
  );
  return encodePointer(transformed);
}

function constantSegment(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

/**
 * Convert a token path into an upper snake-case identifier suitable for constant declarations.
 *
 * @param path - Token path expressed as a JSON Pointer or dot notation.
 * @returns Upper snake-case representation of the provided path.
 */
export function toConstantName(path: string): string {
  const segments = getPathSegments(path);
  const normalized = segments
    .map((segment) => constantSegment(segment))
    .filter(Boolean);
  return normalized.join('_');
}
