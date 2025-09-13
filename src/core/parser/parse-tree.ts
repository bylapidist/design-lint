import type {
  DesignTokens,
  Token,
  TokenGroup,
  FlattenedToken,
} from '../types.js';
import { guards } from '../../utils/index.js';

const {
  data: { isRecord },
  domain: { isToken, isTokenGroup },
} = guards;

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
]);
const INVALID_NAME_CHARS = /[{}\.]/;

function validateExtensions(
  value: unknown,
  path: string,
  onWarn?: (msg: string) => void,
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    throw new Error(`Token or group ${path} has invalid $extensions`);
  }
  for (const key of Object.keys(value)) {
    if (!key.includes('.') && onWarn) {
      onWarn(
        `Token or group ${path} has $extensions key without a dot: ${key}`,
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

// The spec says, "The value of the `$description` property MUST be a plain JSON string."
function validateDescription(value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value !== 'string') {
    throw new Error(`Token or group ${path} has invalid $description`);
  }
}

function validateMetadata(
  node: {
    $extensions?: unknown;
    $deprecated?: unknown;
    $description?: unknown;
  },
  path: string,
  onWarn?: (msg: string) => void,
): void {
  validateExtensions(node.$extensions, path, onWarn);
  validateDeprecated(node.$deprecated, path);
  validateDescription(node.$description, path);
}

export function buildParseTree(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
  onWarn?: (msg: string) => void,
): FlattenedToken[] {
  tokenLocations.clear();
  const result: FlattenedToken[] = [];
  const seenExactPaths = new Set<string>();
  const seenCaseInsensitivePaths = new Map<string, string>();

  function walk(
    group: TokenGroup,
    prefix: string[],
    inheritedType?: string,
    inheritedDeprecated?: boolean | string,
  ): void {
    const pathLabel = prefix.length ? prefix.join('.') : '(root)';
    validateMetadata(group, pathLabel, onWarn);
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
    const seenExactNames = new Set<string>();
    const seenCaseInsensitiveNames = new Map<string, string>();
    // The spec states, "Token names are case-sensitive. Tools MAY display a warning when token names differ only by case."

    for (const name of Object.keys(group)) {
      if (GROUP_PROPS.has(name)) continue;
      if (name.startsWith('$')) {
        throw new Error(`Invalid token or group name: ${name}`);
      }
      if (INVALID_NAME_CHARS.test(name)) {
        throw new Error(`Invalid token or group name: ${name}`);
      }
      if (seenExactNames.has(name)) {
        throw new Error(`Duplicate token name: ${name}`);
      }
      const lower = name.toLowerCase();
      const existing = seenCaseInsensitiveNames.get(lower);
      if (existing && existing !== name && onWarn) {
        onWarn(
          `Duplicate token name differing only by case: ${existing} vs ${name}`,
        );
      } else if (!existing) {
        seenCaseInsensitiveNames.set(lower, name);
      }
      seenExactNames.add(name);

      const node = group[name];
      if (node === undefined) continue;
      const pathParts = [...prefix, name];
      const pathId = pathParts.join('.');
      if (seenExactPaths.has(pathId)) {
        throw new Error(`Duplicate token path: ${pathId}`);
      }
      const lowerPath = pathId.toLowerCase();
      const existingPath = seenCaseInsensitivePaths.get(lowerPath);
      if (existingPath && existingPath !== pathId && onWarn) {
        onWarn(
          `Duplicate token path differing only by case: ${existingPath} vs ${pathId}`,
        );
      } else if (!existingPath) {
        seenCaseInsensitivePaths.set(lowerPath, pathId);
      }
      seenExactPaths.add(pathId);

      if (isRecord(node)) {
        if (isToken(node)) {
          const token: Token = { ...node, $type: node.$type ?? currentType };
          validateMetadata(token, pathId, onWarn);
          const tokenDeprecated = token.$deprecated ?? currentDeprecated;
          if (tokenDeprecated !== undefined)
            token.$deprecated = tokenDeprecated;
          const loc = getLoc ? getLoc(pathId) : { line: 1, column: 1 };
          tokenLocations.set(pathId, loc);
          result.push({
            path: pathId,
            value: token.$value,
            type: token.$type,
            metadata: {
              description: token.$description,
              extensions: token.$extensions,
              deprecated: token.$deprecated,
              loc,
            },
          });
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
