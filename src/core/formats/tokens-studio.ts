import type { DesignTokens, TokenGroup, Token } from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function detectTokensStudio(obj: unknown): boolean {
  if (!isRecord(obj)) return false;
  const stack: unknown[] = [obj];
  while (stack.length) {
    const current = stack.pop();
    if (isRecord(current)) {
      if ('value' in current && 'type' in current && !('$value' in current)) {
        return true;
      }
      for (const v of Object.values(current)) {
        stack.push(v);
      }
    }
  }
  return false;
}

interface LegacyToken {
  value: unknown;
  type: string;
  description?: string;
  extensions?: Record<string, unknown>;
  deprecated?: boolean | string;
}

function isLegacyToken(value: unknown): value is LegacyToken {
  return (
    isRecord(value) &&
    'value' in value &&
    'type' in value &&
    typeof value.type === 'string'
  );
}

function convertGroup(group: Record<string, unknown>): TokenGroup {
  const result: TokenGroup = {};
  for (const [key, value] of Object.entries(group)) {
    if (key === 'type' && !('$type' in group) && typeof value === 'string') {
      result.$type = value;
      continue;
    }
    if (
      key === 'description' &&
      !('$description' in group) &&
      typeof value === 'string'
    ) {
      result.$description = value;
      continue;
    }
    if (key === 'extensions' && !('$extensions' in group) && isRecord(value)) {
      result.$extensions = value;
      continue;
    }
    if (
      key === 'deprecated' &&
      !('$deprecated' in group) &&
      (typeof value === 'boolean' || typeof value === 'string')
    ) {
      result.$deprecated = value;
      continue;
    }
    if (isLegacyToken(value)) {
      const token: Token = { $value: value.value, $type: value.type };
      if (value.description) token.$description = value.description;
      if (value.extensions) token.$extensions = value.extensions;
      if (value.deprecated !== undefined) token.$deprecated = value.deprecated;
      result[key] = token;
    } else if (isRecord(value)) {
      result[key] = convertGroup(value);
    }
  }
  return result;
}

export function tokensStudioToDTCG(data: unknown): DesignTokens | undefined {
  if (!detectTokensStudio(data) || !isRecord(data)) return undefined;
  return convertGroup(data);
}
