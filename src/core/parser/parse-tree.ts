import type {
  DesignTokens,
  Token,
  TokenGroup,
  FlattenedToken,
} from '../types.js';

const tokenLocations = new Map<string, { line: number; column: number }>();

export function getTokenLocation(
  path: string,
): { line: number; column: number } | undefined {
  return tokenLocations.get(path);
}

const GROUP_PROPS = new Set([
  '$type',
  '$description',
  '$extensions',
  '$deprecated',
  '$schema',
  '$metadata',
]);
const INVALID_NAME_CHARS = /[{}\.]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

export function buildParseTree(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
): FlattenedToken[] {
  tokenLocations.clear();
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
          const loc = getLoc ? getLoc(pathId) : { line: 1, column: 1 };
          tokenLocations.set(pathId, loc);
          result.push({ path: pathId, token, loc });
        } else if (isTokenGroup(node)) {
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
  return result;
}
