import type { DesignTokens, TokenGroup, Token } from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function isRGB(value: unknown): value is RGB {
  return (
    isRecord(value) &&
    typeof value.r === 'number' &&
    typeof value.g === 'number' &&
    typeof value.b === 'number'
  );
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function convertColor(value: unknown): string {
  if (isRGB(value)) {
    const r = Math.round(value.r * 255);
    const g = Math.round(value.g * 255);
    const b = Math.round(value.b * 255);
    const a = typeof value.a === 'number' ? value.a : 1;
    if (a === 1) return '#' + toHex(r) + toHex(g) + toHex(b);
    return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(a)})`;
  }
  return String(value);
}

function mapValue(value: unknown, type: string): unknown {
  switch (type) {
    case 'COLOR':
      return convertColor(value);
    case 'FLOAT':
      return typeof value === 'number' ? String(value) + 'px' : value;
    default:
      return value;
  }
}

function mapType(type: string): string | undefined {
  switch (type) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return 'dimension';
    case 'STRING':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    default:
      return undefined;
  }
}

function isTokenGroupNode(value: unknown): value is TokenGroup {
  return (
    isRecord(value) && !Object.prototype.hasOwnProperty.call(value, '$value')
  );
}

export function figmaToDTCG(data: unknown): DesignTokens | undefined {
  if (!isRecord(data) || !Array.isArray(data.collections)) return undefined;
  const result: TokenGroup = {};
  for (const collection of data.collections) {
    if (!isRecord(collection)) continue;
    const variables = Array.isArray(collection.variables)
      ? collection.variables
      : [];
    for (const variable of variables) {
      if (!isRecord(variable)) continue;
      const name =
        typeof variable.name === 'string' ? variable.name : undefined;
      const type =
        typeof variable.type === 'string' ? variable.type : undefined;
      if (!name || !type) continue;
      const description =
        typeof variable.description === 'string'
          ? variable.description
          : undefined;
      const valuesByMode = isRecord(variable.valuesByMode)
        ? variable.valuesByMode
        : undefined;
      const resolvedValuesByMode = isRecord(variable.resolvedValuesByMode)
        ? variable.resolvedValuesByMode
        : undefined;
      const parts = name.split(/[\/]/);
      let group: TokenGroup = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const node = group[part];
        if (isTokenGroupNode(node)) {
          group = node;
        } else {
          const child: TokenGroup = {};
          group[part] = child;
          group = child;
        }
      }
      const last = parts[parts.length - 1];
      let raw: unknown = variable.resolvedValue;
      if (raw === undefined) {
        const byMode = resolvedValuesByMode ?? valuesByMode;
        const first = byMode ? Object.keys(byMode)[0] : undefined;
        raw = first ? byMode?.[first] : undefined;
      }
      const token: Token = { $value: mapValue(raw, type) };
      const mappedType = mapType(type);
      if (mappedType) token.$type = mappedType;
      if (description) token.$description = description;
      group[last] = token;
    }
  }
  return result;
}
