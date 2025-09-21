import type { FlattenedToken } from '../types.js';

function collectTokenValues(
  token: Pick<FlattenedToken, 'value' | 'fallbacks'>,
): unknown[] {
  const values: unknown[] = [];
  if (token.value !== undefined) {
    values.push(token.value);
  }
  if (Array.isArray(token.fallbacks)) {
    values.push(...token.fallbacks);
  }
  return values;
}

export function forEachTokenValue(
  token: Pick<FlattenedToken, 'value' | 'fallbacks'>,
  iteratee: (value: unknown, index: number) => void,
): void {
  const values = collectTokenValues(token);
  values.forEach((value, index) => {
    iteratee(value, index);
  });
}

export function mapTokenValues(
  token: FlattenedToken,
  mapper: (value: unknown, index: number) => unknown,
): void {
  const values = collectTokenValues(token);
  if (values.length === 0) {
    return;
  }
  const transformed = values.map(mapper);
  const [primary, ...rest] = transformed;
  token.value = primary;
  token.fallbacks = rest.length > 0 ? rest : undefined;
}

export function describeTokenValueLocation(
  token: Pick<FlattenedToken, 'path'>,
  index: number,
): string {
  if (index === 0) {
    return token.path;
  }
  return `${token.path}[$value][${String(index)}]`;
}
