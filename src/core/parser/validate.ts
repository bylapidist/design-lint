import type { Token, FlattenedToken } from '../types.js';
import { expectAlias, isAlias } from './normalize.js';

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
const DIMENSION_UNITS = new Set(['px', 'rem']);
const DURATION_UNITS = new Set(['ms', 's']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function validateColor(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (typeof value === 'string') {
    if (isAlias(value)) expectAlias(value, path, 'color', tokenMap);
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
    typeof value.unit === 'string' &&
    DIMENSION_UNITS.has(value.unit)
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
    if (isAlias(value)) expectAlias(value, path, 'fontFamily', tokenMap);
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
    if (isAlias(value)) {
      expectAlias(value, path, 'fontWeight', tokenMap);
      return;
    }
    if (FONT_WEIGHT_KEYWORDS.has(value)) return;
  }
  throw new Error(`Token ${path} has invalid fontWeight value`);
}

function validateDuration(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (
    isRecord(value) &&
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    DURATION_UNITS.has(value.unit)
  ) {
    return;
  }
  if (typeof value === 'string') {
    expectAlias(value, path, 'duration', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid duration value`);
}

function validateShadow(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  const items = Array.isArray(value) ? value : [value];
  if (!Array.isArray(items)) {
    throw new Error(`Token ${path} has invalid shadow value`);
  }
  for (let i = 0; i < items.length; i++) {
    const item: unknown = items[i];
    if (!isRecord(item)) {
      throw new Error(`Token ${path} has invalid shadow value`);
    }
    const allowed = new Set([
      'color',
      'offsetX',
      'offsetY',
      'blur',
      'spread',
      'inset',
    ]);
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) {
        throw new Error(`Token ${path} has invalid shadow value`);
      }
    }
    const base = `${path}[${String(i)}]`;
    validateColor(item.color, `${base}.color`, tokenMap);
    validateDimension(item.offsetX, `${base}.offsetX`, tokenMap);
    validateDimension(item.offsetY, `${base}.offsetY`, tokenMap);
    validateDimension(item.blur, `${base}.blur`, tokenMap);
    if (item.spread !== undefined) {
      validateDimension(item.spread, `${base}.spread`, tokenMap);
    }
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
    const allowed = new Set(['dashArray', 'lineCap']);
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        throw new Error(`Token ${path} has invalid strokeStyle value`);
      }
    }
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
  const stops = value;
  for (let i = 0; i < stops.length; i++) {
    const stop: unknown = stops[i];
    if (!isRecord(stop)) {
      throw new Error(`Token ${path} has invalid gradient value`);
    }
    const allowed = new Set(['color', 'position']);
    for (const key of Object.keys(stop)) {
      if (!allowed.has(key)) {
        throw new Error(`Token ${path} has invalid gradient value`);
      }
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
  const allowed = new Set([
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`Token ${path} has invalid typography value`);
    }
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

function validateCubicBezier(
  value: unknown,
  path: string,
  tokenMap: Map<string, Token>,
): void {
  if (Array.isArray(value) && value.length === 4) {
    for (let i = 0; i < 4; i++) {
      const v: unknown = value[i];
      if (typeof v === 'number') {
        if (v < 0 || v > 1) {
          throw new Error(`Token ${path} has invalid cubicBezier value`);
        }
      } else if (typeof v === 'string') {
        expectAlias(v, `${path}[${String(i)}]`, 'number', tokenMap);
      } else {
        throw new Error(`Token ${path} has invalid cubicBezier value`);
      }
    }
    return;
  }
  if (typeof value === 'string') {
    expectAlias(value, path, 'cubicBezier', tokenMap);
    return;
  }
  throw new Error(`Token ${path} has invalid cubicBezier value`);
}

function validateToken(
  path: string,
  token: Token,
  tokenMap: Map<string, Token>,
): void {
  validateMetadata(token, path);
  if (token.$value === undefined) {
    throw new Error(`Token ${path} is missing $value`);
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
    case 'duration':
      validateDuration(token.$value, path, tokenMap);
      break;
    case 'cubicBezier':
      validateCubicBezier(token.$value, path, tokenMap);
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

export function validateTokens(tokens: FlattenedToken[]): void {
  const tokenMap = new Map(tokens.map((t) => [t.path, t.token]));
  for (const { path, token } of tokens) {
    validateToken(path, token, tokenMap);
  }
}
