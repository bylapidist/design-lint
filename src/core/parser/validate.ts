import type { Token, FlattenedToken } from '../types.js';
import { validatorRegistry } from '../token-validators/index.js';
import { isRecord } from '../../utils/type-guards/index.js';

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
  const validator = validatorRegistry.get(token.$type);
  if (!validator) {
    throw new Error(`Token ${path} has unknown $type ${token.$type}`);
  }
  validator(token.$value, path, tokenMap);
}

export function validateTokens(tokens: FlattenedToken[]): void {
  const tokenMap = new Map(tokens.map((t) => [t.path, t.token]));
  for (const { path, token } of tokens) {
    validateToken(path, token, tokenMap);
  }
}
