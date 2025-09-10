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
const LEGACY_PROPS = new Set([
  'type',
  'value',
  'description',
  'extensions',
  'deprecated',
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

export function buildParseTree(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
): FlattenedToken[] {
  tokenLocations.clear();
  const result: FlattenedToken[] = [];
  const seenPaths = new Map<string, string>();

  interface ParseError extends Error {
    loc?: { line: number; column: number };
    path?: string;
  }

  const error = (path: string, message: string): never => {
    const err: ParseError = new Error(message);
    err.path = path;
    if (getLoc) err.loc = getLoc(path);
    throw err;
  };

  function validateExtensions(value: unknown, path: string): void {
    if (value === undefined) return;
    if (!isRecord(value)) {
      const label = path || '(root)';
      error(path, `Token or group ${label} has invalid $extensions`);
      return;
    }
    for (const key of Object.keys(value)) {
      if (!key.includes('.')) {
        const label = path || '(root)';
        error(
          path,
          `Token or group ${label} has invalid $extensions key: ${key}`,
        );
      }
    }
  }

  function validateDeprecated(value: unknown, path: string): void {
    if (value === undefined) return;
    if (typeof value !== 'boolean' && typeof value !== 'string') {
      const label = path || '(root)';
      error(path, `Token or group ${label} has invalid $deprecated`);
    }
  }

  function validateMetadata(
    node: { $extensions?: unknown; $deprecated?: unknown },
    path: string,
  ): void {
    validateExtensions(node.$extensions, path);
    validateDeprecated(node.$deprecated, path);
  }

  function walk(
    group: TokenGroup,
    prefix: string[],
    inheritedType?: string,
    inheritedDeprecated?: boolean | string,
  ): void {
    const pathId = prefix.join('.');
    validateMetadata(group, pathId);
    if (prefix.length === 0) {
      if (
        '$schema' in group &&
        typeof Reflect.get(group, '$schema') !== 'string'
      ) {
        error(pathId, 'Root group has invalid $schema');
      }
    } else if ('$schema' in group) {
      error(pathId, '$schema is only allowed on the root group');
    }
    const currentType = group.$type ?? inheritedType;
    const currentDeprecated = group.$deprecated ?? inheritedDeprecated;
    const seenNames = new Map<string, string>();

    for (const name of Object.keys(group)) {
      if (GROUP_PROPS.has(name)) continue;
      const pathParts = [...prefix, name];
      const childPath = pathParts.join('.');
      if (name.startsWith('$')) {
        error(childPath, `Invalid token or group name: ${name}`);
      }
      if (INVALID_NAME_CHARS.test(name)) {
        error(childPath, `Invalid token or group name: ${name}`);
      }
      const lower = name.toLowerCase();
      const existing = seenNames.get(lower);
      if (existing) {
        if (existing === name) {
          error(childPath, `Duplicate token name: ${name}`);
        }
        error(
          childPath,
          `Duplicate token name differing only by case: ${existing} vs ${name}`,
        );
      }
      seenNames.set(lower, name);

      const node = group[name];
      if (node === undefined) continue;
      const lowerPath = childPath.toLowerCase();
      const existingPath = seenPaths.get(lowerPath);
      if (existingPath) {
        if (existingPath === childPath) {
          error(childPath, `Duplicate token path: ${childPath}`);
        }
        error(
          childPath,
          `Duplicate token path differing only by case: ${existingPath} vs ${childPath}`,
        );
      }
      seenPaths.set(lowerPath, childPath);

      if (isRecord(node)) {
        if (isToken(node)) {
          const token: Token = { ...node, $type: node.$type ?? currentType };
          const tokenDeprecated = token.$deprecated ?? currentDeprecated;
          if (tokenDeprecated !== undefined)
            token.$deprecated = tokenDeprecated;
          const loc = getLoc ? getLoc(childPath) : { line: 1, column: 1 };
          tokenLocations.set(childPath, loc);
          result.push({ path: childPath, token, loc });
        } else if (isTokenGroup(node)) {
          for (const key of Object.keys(node)) {
            if (LEGACY_PROPS.has(key)) {
              error(
                childPath,
                `Token ${childPath} uses legacy property ${key}; expected $${key}`,
              );
            }
          }
          const childKeys = Object.keys(node).filter(
            (k) => !GROUP_PROPS.has(k),
          );
          if ('$type' in node && childKeys.length === 0) {
            error(childPath, `Token ${childPath} is missing $value`);
          }
          walk(node, pathParts, currentType, currentDeprecated);
        } else {
          error(childPath, `Token ${childPath} must be an object with $value`);
        }
      } else {
        error(childPath, `Token ${childPath} must be an object with $value`);
      }
    }
  }

  walk(tokens, [], undefined, undefined);
  return result;
}
