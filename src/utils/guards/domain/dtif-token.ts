import type { DtifFlattenedToken } from '../../../core/types.js';
import { isRecord } from '../data/index.js';

const HEX_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Determine whether a flattened DTIF token belongs to the provided top-level group.
 *
 * @param token - Token to examine.
 * @param group - Top-level group name, e.g. `color` or `spacing`.
 */
export function isTokenInGroup(
  token: DtifFlattenedToken,
  group: string,
): boolean {
  return token.path.length > 1 && token.path[0] === group;
}

/**
 * Extract a token's string value when it represents a literal instead of an alias.
 *
 * @param token - Token to examine.
 * @param options - Controls alias handling.
 * @returns String literal value when present.
 */
export function getTokenStringValue(
  token: DtifFlattenedToken,
  options: { allowAliases?: boolean } = {},
): string | undefined {
  const allowAliases = options.allowAliases ?? false;
  const candidates: unknown[] = [token.resolution?.value, token.value];

  for (const candidate of candidates) {
    const literal = extractLiteral(candidate, allowAliases);
    if (literal !== undefined) {
      return literal;
    }
  }

  if (token.type === 'color') {
    for (const candidate of candidates) {
      const formatted = formatColorValue(candidate, allowAliases);
      if (formatted !== undefined) {
        return formatted;
      }
    }
  }

  return undefined;
}

function extractLiteral(
  value: unknown,
  allowAliases: boolean,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  if (!allowAliases && value.startsWith('{')) {
    return undefined;
  }
  return value;
}

function formatColorValue(
  value: unknown,
  allowAliases: boolean,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return extractLiteral(value, allowAliases);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const formatted = formatColorValue(entry, allowAliases);
      if (formatted !== undefined) {
        return formatted;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const colorSpace: unknown = value.colorSpace;
  const components: unknown = value.components;
  const hex: unknown = value.hex;
  const alpha: unknown = value.alpha;

  if (typeof hex === 'string' && HEX_PATTERN.test(hex)) {
    return hex.toLowerCase();
  }

  if (typeof colorSpace !== 'string' || !Array.isArray(components)) {
    return undefined;
  }

  const parts: string[] = [];
  for (const component of components) {
    if (typeof component === 'number' && Number.isFinite(component)) {
      parts.push(formatNumber(component));
      continue;
    }
    if (component === 'none') {
      parts.push('none');
      continue;
    }
    return undefined;
  }

  let suffix = '';
  if (alpha !== undefined) {
    if (typeof alpha !== 'number' || !Number.isFinite(alpha)) {
      return undefined;
    }
    suffix = ` / ${formatNumber(alpha)}`;
  }

  return `color(${colorSpace} ${parts.join(' ')}${suffix})`;
}

function formatNumber(value: number): string {
  return String(value);
}
