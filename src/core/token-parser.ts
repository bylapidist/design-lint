import type { DesignTokens, Token, TokenGroup } from './types.js';
import type { FlattenedToken } from './token-utils.js';

const GROUP_PROPS = new Set([
  '$type',
  '$description',
  '$extensions',
  '$deprecated',
  '$schema',
]);
const INVALID_NAME_CHARS = /[{}\.]/;
const ALIAS_PATTERN = /^\{([^}]+)\}$/;

const STROKE_STYLE_KEYWORDS = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'outset',
  'inset',
]);
const STROKE_LINECAPS = new Set(['round', 'butt', 'square']);
const FONT_WEIGHT_KEYWORDS = new Set([
  'thin',
  'hairline',
  'extra-light',
  'ultra-light',
  'light',
  'normal',
  'regular',
  'book',
  'medium',
  'semi-bold',
  'demi-bold',
  'bold',
  'extra-bold',
  'ultra-bold',
  'black',
  'heavy',
  'extra-black',
  'ultra-black',
]);

function isToken(node: Token | TokenGroup): node is Token {
  return '$value' in node;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAlias(value: unknown): string | null {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    return m ? m[1] : null;
  }
  return null;
}

function validateExtensions(value: unknown, path: string): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    throw new Error(`Token or group ${path} has invalid $extensions`);
  }
  for (const key of Object.keys(value)) {
    if (!key.includes('.')) {
      throw new Error(
        `Token or group ${path} has invalid $extensions key: ${key}`,
      );
    }
  }
}

function validateDeprecated(value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value !== 'boolean' && typeof value !== 'string') {
    throw new Error(`Token or group ${path} has invalid $deprecated`);
  }
}

function validateMetadata(
  node: { $extensions?: unknown; $deprecated?: unknown },
  path: string,
): void {
  validateExtensions(node.$extensions, path);
  validateDeprecated(node.$deprecated, path);
}

function resolveAlias(
  targetPath: string,
  tokenMap: Map<string, Token>,
  stack: string[],
): Token {
  if (stack.includes(targetPath)) {
    throw new Error(
      `Circular alias reference: ${[...stack, targetPath].join(' -> ')}`,
    );
  }
  const target = tokenMap.get(targetPath);
  if (!target) {
    const source = stack[0];
    throw new Error(`Token ${source} references unknown token: ${targetPath}`);
  }
  const next =
    typeof target.$value === 'string'
      ? ALIAS_PATTERN.exec(target.$value)
      : null;
  if (next) {
    return resolveAlias(next[1], tokenMap, [...stack, targetPath]);
  }
  if (!target.$type) {
    const source = stack[0];
    throw new Error(
      `Token ${source} references token without $type: ${targetPath}`,
    );
  }
  if (target.$value === undefined) {
    const source = stack[0];
    throw new Error(
      `Token ${source} references token without $value: ${targetPath}`,
    );
  }
  return target;
}

function expectAlias(
  value: string,
  path: string,
  expected: string,
  tokenMap: Map<string, Token>,
): void {
  const targetPath = isAlias(value);
  if (!targetPath) {
    throw new Error(`Token ${path} has invalid ${expected} reference`);
  }
  const target = resolveAlias(targetPath, tokenMap, [path]);
  if (target.$type !== expected) {
    throw new Error(
      `Token ${path} references token of type ${String(target.$type)}; expected ${expected}`,
    );
  }
}

function validateColor(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    if (m) expectAlias(value, path, 'color', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid color value`);
}

function validateDimension(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string'
  ) {
    return;
  }
  if (typeof value === 'string') {
    expectAlias(value, path, 'dimension', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid dimension value`);
}

function validateNumber(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'number') return;
  if (typeof value === 'string') {
    expectAlias(value, path, 'number', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid number value`);
}

function validateFontFamily(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    if (m) expectAlias(value, path, 'fontFamily', tokenMap);
    return;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return;
  throw new Error(`Token ${path} has invalid fontFamily value`);
}

function validateFontWeight(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'number') {
    if (value < 1 || value > 1000) {
      throw new Error(`Token ${path} has invalid fontWeight value`);
    }
    return;
  }
  if (typeof value === 'string') {
    const m = ALIAS_PATTERN.exec(value);
    if (m) {
      expectAlias(value, path, 'fontWeight', tokenMap);
      return;
    }
    if (FONT_WEIGHT_KEYWORDS.has(value)) return;
  }
  throw new Error(`Token ${path} has invalid fontWeight value`);
}

function validateShadow(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  const items = Array.isArray(value) ? (value as unknown[]) : [value];
  if (!Array.isArray(items)) {
    throw new Error(`Token ${path} has invalid shadow value`);
  }
  for (let i = 0; i < items.length; i++) {
    const item: unknown = items[i];
    if (!isRecord(item)) {
      throw new Error(`Token ${path} has invalid shadow value`);
    }
    const base = `${path}[${String(i)}]`;
    validateColor(item.color, `${base}.color`, tokenMap);
    validateDimension(item.offsetX, `${base}.offsetX`, tokenMap);
    validateDimension(item.offsetY, `${base}.offsetY`, tokenMap);
    validateDimension(item.blur, `${base}.blur`, tokenMap);
    validateDimension(item.spread, `${base}.spread`, tokenMap);
    if ('inset' in item && typeof item.inset !== 'boolean') {
      throw new Error(`Token ${path} has invalid shadow value`);
    }
  }
}

function validateStrokeStyle(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    if (!STROKE_STYLE_KEYWORDS.has(value)) {
      throw new Error(`Token ${path} has invalid strokeStyle value`);
    }
    return;
  }
  if (isRecord(value)) {
    if (!Array.isArray(value.dashArray) || value.dashArray.length === 0) {
      throw new Error(`Token ${path} has invalid strokeStyle value`);
    }
    for (let i = 0; i < value.dashArray.length; i++) {
      validateDimension(
        value.dashArray[i],
        `${path}.dashArray[${String(i)}]`,
        tokenMap,
      );
    }
    if (
      typeof value.lineCap !== 'string' ||
      !STROKE_LINECAPS.has(value.lineCap)
    ) {
      throw new Error(`Token ${path} has invalid strokeStyle value`);
    }
    return;
  }
  throw new Error(`Token ${path} has invalid strokeStyle value`);
}

function validateGradient(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Token ${path} has invalid gradient value`);
  }
  const stops = value as unknown[];
  for (let i = 0; i < stops.length; i++) {
    const stop: unknown = stops[i];
    if (!isRecord(stop)) {
      throw new Error(`Token ${path} has invalid gradient value`);
    }
    validateColor(stop.color, `${path}[${String(i)}].color`, tokenMap);
    const pos = stop.position;
    if (typeof pos === 'number') {
      // allow any number; clamping is handled by consumers
    } else if (typeof pos === 'string') {
      expectAlias(pos, `${path}[${String(i)}].position`, 'number', tokenMap);
    } else {
      throw new Error(`Token ${path} has invalid gradient value`);
    }
  }
}

function validateTypography(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (!isRecord(value)) {
    throw new Error(`Token ${path} has invalid typography value`);
  }
  const { fontFamily, fontSize, fontWeight, lineHeight } = value;
  if (
    fontFamily === undefined ||
    fontSize === undefined ||
    fontWeight === undefined ||
    lineHeight === undefined
  ) {
    throw new Error(`Token ${path} has invalid typography value`);
  }
  validateFontFamily(fontFamily, `${path}.fontFamily`, tokenMap);
  validateDimension(fontSize, `${path}.fontSize`, tokenMap);
  validateFontWeight(fontWeight, `${path}.fontWeight`, tokenMap);
  validateNumber(lineHeight, `${path}.lineHeight`, tokenMap);
}

function validateToken(
  path: string,
  token: Token,
  tokenMap: Map<string, Token>,
): void {
  validateMetadata(token, path);
  if (typeof token.$value === 'string') {
    const match = ALIAS_PATTERN.exec(token.$value);
    if (match) {
      const target = resolveAlias(match[1], tokenMap, [path]);
      const aliasType = target.$type;
      if (!aliasType) {
        throw new Error(
          `Token ${path} references token without $type: ${match[1]}`,
        );
      }
      if (!token.$type) {
        token.$type = aliasType;
      } else if (token.$type !== aliasType) {
        throw new Error(
          `Token ${path} has mismatched $type ${token.$type}; expected ${aliasType}`,
        );
      }
    }
  }

  if (!token.$type) {
    throw new Error(`Token ${path} is missing $type`);
  }

  switch (token.$type) {
    case 'color':
      validateColor(token.$value, path, tokenMap);
      break;
    case 'dimension':
      validateDimension(token.$value, path, tokenMap);
      break;
    case 'number':
      validateNumber(token.$value, path, tokenMap);
      break;
    case 'fontFamily':
      validateFontFamily(token.$value, path, tokenMap);
      break;
    case 'fontWeight':
      validateFontWeight(token.$value, path, tokenMap);
      break;
    case 'shadow':
      validateShadow(token.$value, path, tokenMap);
      break;
    case 'strokeStyle':
      validateStrokeStyle(token.$value, path, tokenMap);
      break;
    case 'gradient':
      validateGradient(token.$value, path, tokenMap);
      break;
    case 'typography':
      validateTypography(token.$value, path, tokenMap);
      break;
  }
}

export function parseDesignTokens(tokens: DesignTokens): FlattenedToken[] {
  const result: FlattenedToken[] = [];
  const seenPaths = new Map<string, string>();

  function walk(
    group: TokenGroup,
    prefix: string[],
    inheritedType?: string,
    inheritedDeprecated?: boolean | string,
  ): void {
    const pathLabel = prefix.length ? prefix.join('.') : '(root)';
    validateMetadata(group, pathLabel);
    const currentType = group.$type ?? inheritedType;
    const currentDeprecated = group.$deprecated ?? inheritedDeprecated;
    const seenNames = new Map<string, string>();

    for (const name of Object.keys(group)) {
      if (GROUP_PROPS.has(name)) continue;
      if (name.startsWith('$')) {
        throw new Error(`Invalid token or group name: ${name}`);
      }
      if (INVALID_NAME_CHARS.test(name)) {
        throw new Error(`Invalid token or group name: ${name}`);
      }
      const lower = name.toLowerCase();
      const existing = seenNames.get(lower);
      if (existing) {
        if (existing === name) {
          throw new Error(`Duplicate token name: ${name}`);
        }
        throw new Error(
          `Duplicate token name differing only by case: ${existing} vs ${name}`,
        );
      }
      seenNames.set(lower, name);

      const node = (group as Record<string, TokenGroup | Token | undefined>)[
        name
      ];
      if (node === undefined) continue;
      const pathParts = [...prefix, name];
      const pathId = pathParts.join('.');
      const lowerPath = pathId.toLowerCase();
      const existingPath = seenPaths.get(lowerPath);
      if (existingPath) {
        if (existingPath === pathId) {
          throw new Error(`Duplicate token path: ${pathId}`);
        }
        throw new Error(
          `Duplicate token path differing only by case: ${existingPath} vs ${pathId}`,
        );
      }
      seenPaths.set(lowerPath, pathId);

      if (isToken(node)) {
        const token: Token = { ...node, $type: node.$type ?? currentType };
        const tokenDeprecated = token.$deprecated ?? currentDeprecated;
        if (tokenDeprecated !== undefined) token.$deprecated = tokenDeprecated;
        result.push({ path: pathId, token });
      } else {
        walk(node, pathParts, currentType, currentDeprecated);
      }
    }
  }

  walk(tokens, [], undefined, undefined);
  const tokenMap = new Map(result.map((t) => [t.path, t.token]));
  for (const { path, token } of result) {
    validateToken(path, token, tokenMap);
  }
  return result;
}
