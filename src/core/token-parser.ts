import type {
  DesignTokens,
  Token,
  TokenGroup,
  FlattenedToken,
} from './types.js';
import {
  ALIAS_PATTERN,
  resolveAlias,
  isRecord,
} from './token-validators/utils.js';
import { validatorRegistry } from './token-validators/index.js';

const GROUP_PROPS = new Set([
  '$type',
  '$description',
  '$extensions',
  '$deprecated',
  '$schema',
  '$metadata',
]);
const LEGACY_PROPS = new Set([
  'type',
  'value',
  'description',
  'extensions',
  'deprecated',
]);
const INVALID_NAME_CHARS = /[{}\.]/;

function isToken(node: unknown): node is Token {
  return isRecord(node) && '$value' in node;
}

function isTokenGroup(node: unknown): node is TokenGroup {
  return isRecord(node) && !isToken(node);
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

function validateToken(
  path: string,
  token: Token,
  tokenMap: Map<string, Token>,
): void {
  validateMetadata(token, path);
  if (token.$value === undefined) {
    throw new Error(`Token ${path} is missing $value`);
  }
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
      token.$value = target.$value;
    }
  }

  if (!token.$type) {
    throw new Error(`Token ${path} is missing $type`);
  }
  const validator = validatorRegistry.get(token.$type);
  if (!validator) {
    throw new Error(`Token ${path} has unsupported $type ${token.$type}`);
  }
  validator(token.$value, path, tokenMap);
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
    if (prefix.length === 0) {
      if (
        '$schema' in group &&
        typeof Reflect.get(group, '$schema') !== 'string'
      ) {
        throw new Error('Root group has invalid $schema');
      }
    } else if ('$schema' in group) {
      throw new Error('$schema is only allowed on the root group');
    }
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

      const node = group[name];
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

      if (isRecord(node)) {
        if (isToken(node)) {
          const token: Token = { ...node, $type: node.$type ?? currentType };
          const tokenDeprecated = token.$deprecated ?? currentDeprecated;
          if (tokenDeprecated !== undefined)
            token.$deprecated = tokenDeprecated;
          result.push({ path: pathId, token });
        } else if (isTokenGroup(node)) {
          for (const key of Object.keys(node)) {
            if (LEGACY_PROPS.has(key)) {
              throw new Error(
                `Token ${pathId} uses legacy property ${key}; expected $${key}`,
              );
            }
          }
          const childKeys = Object.keys(node).filter(
            (k) => !GROUP_PROPS.has(k),
          );
          if ('$type' in node && childKeys.length === 0) {
            throw new Error(`Token ${pathId} is missing $value`);
          }
          walk(node, pathParts, currentType, currentDeprecated);
        } else {
          throw new Error(`Token ${pathId} must be an object with $value`);
        }
      } else {
        throw new Error(`Token ${pathId} must be an object with $value`);
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
