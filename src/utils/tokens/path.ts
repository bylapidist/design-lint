/**
 * @packageDocumentation
 *
 * Utilities for normalizing design token paths and applying name transforms.
 */

import { isPointerFragment, pointerToPath } from './pointer.js';

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

/**
 * Normalize a token path to dot notation with optional case transforms.
 *
 * @param path - Original token path using dot separators or JSON Pointer fragments.
 * @param transform - Optional casing applied to each path segment.
 * @returns Normalized dot-notation path.
 */
export function normalizePath(path: string, transform?: NameTransform): string {
  let canonical = path;
  const hashIndex = path.indexOf('#');
  if (hashIndex !== -1) {
    const fragment = path.slice(hashIndex);
    if (!isPointerFragment(fragment)) {
      throw new Error(
        `Alias pointers must be valid JSON Pointer fragments: ${path}`,
      );
    }
    const pointerPath = pointerToPath(fragment);
    if (!pointerPath) {
      throw new Error(
        `Alias pointer must reference a token within the same document: ${path}`,
      );
    }
    canonical = pointerPath;
  }

  const parts = canonical.split('.').filter(Boolean);
  return parts.map((p) => transformSegment(p, transform)).join('.');
}

/**
 * Convert a normalized token path into an upper snake-case identifier suitable
 * for constant declarations.
 *
 * @param path - Normalized dot-notation token path.
 * @returns Upper snake-case representation of the provided path.
 */
export function toConstantName(path: string): string {
  return path.replace(/[./]/g, '_').replace(/-/g, '_').toUpperCase();
}
