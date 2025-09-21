import type {
  DesignTokens,
  Token,
  TokenGroup,
  FlattenedToken,
} from '../types.js';
import type { DeprecationMetadata } from '@lapidist/dtif-schema';
import { guards } from '../../utils/index.js';
import { segmentsToPointer } from '../../utils/tokens/index.js';

const {
  data: { isRecord },
  domain: { isToken, isTokenGroup },
} = guards;

const tokenLocations = new Map<string, { line: number; column: number }>();

export function getTokenLocation(
  identifier: string,
): { line: number; column: number } | undefined {
  return tokenLocations.get(identifier);
}

const RESERVED_COLLECTION_PROPS = new Set([
  '$type',
  '$description',
  '$extensions',
  '$deprecated',
  '$schema',
  '$version',
  '$overrides',
  '$lastModified',
  '$lastUsed',
  '$usageCount',
  '$author',
  '$tags',
  '$hash',
]);

const INVALID_NAME_CHARS = /[{}\.]/;

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isDeprecationObject(value: unknown): value is DeprecationMetadata {
  if (!isRecord(value)) return false;
  const replacement = Reflect.get(value, '$replacement');
  return replacement === undefined || typeof replacement === 'string';
}

function validateExtensions(
  value: unknown,
  path: string,
  onWarn?: (msg: string) => void,
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    throw new Error(`Token or group ${path} has invalid $extensions`);
  }
  if (!onWarn) return;
  for (const key of Object.keys(value)) {
    if (!key.includes('.')) {
      onWarn(
        `Token or group ${path} has $extensions key without a dot: ${key}`,
      );
    }
  }
}

function validateDeprecated(value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value === 'boolean') return;
  if (isDeprecationObject(value)) return;
  throw new Error(`Token or group ${path} has invalid $deprecated`);
}

function validateDescription(value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value !== 'string') {
    throw new Error(`Token or group ${path} has invalid $description`);
  }
}

function validateNodeMetadata(
  node: Token | TokenGroup | DesignTokens,
  path: string,
  onWarn?: (msg: string) => void,
): void {
  validateExtensions(Reflect.get(node, '$extensions'), path, onWarn);
  validateDeprecated(Reflect.get(node, '$deprecated'), path);
  validateDescription(Reflect.get(node, '$description'), path);
}

function toPointer(segments: string[]): string {
  return segmentsToPointer(segments);
}

function readString(
  node: Token | TokenGroup | DesignTokens,
  key: string,
): string | undefined {
  const value = Reflect.get(node, key);
  return typeof value === 'string' ? value : undefined;
}

function readNumber(
  node: Token | TokenGroup | DesignTokens,
  key: string,
): number | undefined {
  const value = Reflect.get(node, key);
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function readRecord(
  node: Token | TokenGroup | DesignTokens,
  key: string,
): Record<string, unknown> | undefined {
  const value = Reflect.get(node, key);
  return isRecord(value) ? value : undefined;
}

function readStringArray(
  node: Token | TokenGroup | DesignTokens,
  key: string,
): string[] | undefined {
  const value = Reflect.get(node, key);
  return isStringArray(value) ? value : undefined;
}

function readDeprecated(
  node: Token | TokenGroup | DesignTokens,
  fallback?: DeprecationMetadata,
): DeprecationMetadata | undefined {
  const value = Reflect.get(node, '$deprecated');
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (isDeprecationObject(value)) return value;
  return fallback;
}

function readTokenMetadata(
  token: Token,
  fallbackDeprecated?: DeprecationMetadata,
): Omit<FlattenedToken['metadata'], 'loc'> {
  const metadata: Omit<FlattenedToken['metadata'], 'loc'> = {};
  const description = readString(token, '$description');
  if (description !== undefined) metadata.description = description;
  const extensions = readRecord(token, '$extensions');
  if (extensions !== undefined) metadata.extensions = extensions;
  const deprecated = readDeprecated(token, fallbackDeprecated);
  if (deprecated !== undefined) metadata.deprecated = deprecated;
  const lastModified = readString(token, '$lastModified');
  if (lastModified !== undefined) metadata.lastModified = lastModified;
  const lastUsed = readString(token, '$lastUsed');
  if (lastUsed !== undefined) metadata.lastUsed = lastUsed;
  const usageCount = readNumber(token, '$usageCount');
  if (usageCount !== undefined) metadata.usageCount = usageCount;
  const author = readString(token, '$author');
  if (author !== undefined) metadata.author = author;
  const tags = readStringArray(token, '$tags');
  if (tags !== undefined) metadata.tags = tags;
  const hash = readString(token, '$hash');
  if (hash !== undefined) metadata.hash = hash;
  return metadata;
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
  const seenPointers = new Set<string>();

  function walk(
    group: TokenGroup | DesignTokens,
    pathSegments: string[],
    pointerSegments: string[],
    inheritedDeprecated?: DeprecationMetadata,
  ): void {
    const pathLabel = pathSegments.length ? pathSegments.join('.') : '(root)';
    validateNodeMetadata(group, pathLabel, onWarn);
    const rawSchema = Reflect.get(group, '$schema');
    if (pathSegments.length === 0) {
      if (rawSchema !== undefined && typeof rawSchema !== 'string') {
        throw new Error('Root collection has invalid $schema');
      }
    } else if (rawSchema !== undefined) {
      throw new Error('$schema is only allowed on the root collection');
    }

    const currentDeprecated = readDeprecated(group, inheritedDeprecated);
    const seenExactNames = new Set<string>();
    const seenCaseInsensitiveNames = new Map<string, string>();

    for (const name of Object.keys(group)) {
      if (RESERVED_COLLECTION_PROPS.has(name)) continue;
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

      const nextPathSegments = [...pathSegments, name];
      const nextPointerSegments = [...pointerSegments, name];
      const pathId = nextPathSegments.join('.');
      const pointer = toPointer(nextPointerSegments);
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
      if (seenPointers.has(pointer)) {
        throw new Error(`Duplicate token pointer: ${pointer}`);
      }
      seenPointers.add(pointer);

      if (isRecord(node)) {
        if (isToken(node)) {
          const token = node;
          validateNodeMetadata(token, pathId, onWarn);
          const tokenType = readString(token, '$type');
          const metadataBase = readTokenMetadata(token, currentDeprecated);
          const tokenValue = Reflect.get(token, '$value');
          const tokenRef = readString(token, '$ref');
          if (tokenValue === undefined && tokenRef === undefined) {
            throw new Error(`Token ${pathId} is missing $value or $ref`);
          }
          const loc = getLoc ? getLoc(pathId) : { line: 1, column: 1 };
          tokenLocations.set(pathId, loc);
          tokenLocations.set(pointer, loc);
          result.push({
            path: pathId,
            pointer,
            value: tokenValue,
            ...(tokenRef !== undefined ? { ref: tokenRef } : {}),
            type: tokenType,
            metadata: {
              ...metadataBase,
              loc,
            },
          });
        } else if (isTokenGroup(node)) {
          walk(node, nextPathSegments, nextPointerSegments, currentDeprecated);
        } else {
          throw new Error(
            `Token ${pathId} must be an object with $value or $ref`,
          );
        }
      } else {
        throw new Error(
          `Token ${pathId} must be an object with $value or $ref`,
        );
      }
    }
  }

  walk(tokens, [], [], undefined);
  return result;
}
