import { JsonPointer } from 'jsonpointerx';
import type {
  DesignTokens,
  FlattenedToken,
  Token,
  TokenGroup,
} from '../types.js';
import type { DeprecationMetadata } from '@lapidist/dtif-schema';
import { guards } from '../../utils/index.js';

const {
  data: { isRecord },
  domain: { isToken },
} = guards;

const tokenLocations = new Map<string, { line: number; column: number }>();

export function getTokenLocation(
  path: string,
): { line: number; column: number } | undefined {
  return tokenLocations.get(path);
}

function getLocation(
  pointer: string,
  getLoc?: (path: string) => { line: number; column: number },
): { line: number; column: number } {
  if (!getLoc) return { line: 1, column: 1 };
  try {
    return getLoc(pointer);
  } catch (error) {
    if (error instanceof Error) {
      // fall through to default when the location lookup fails
    }
  }
  return { line: 1, column: 1 };
}

function toPointer(segments: string[]): string {
  if (segments.length === 0) return '';
  return new JsonPointer(segments).toString();
}

function getCollectionType(
  collection: TokenGroup,
  inheritedType?: string,
): string | undefined {
  if ('$type' in collection) {
    const candidate = collection.$type;
    if (typeof candidate === 'string') {
      return candidate;
    }
  }
  return inheritedType;
}

function getCollectionDeprecated(
  collection: TokenGroup,
  inheritedDeprecated?: DeprecationMetadata,
): DeprecationMetadata | undefined {
  if ('$deprecated' in collection) {
    const candidate = collection.$deprecated;
    if (isDeprecationMetadata(candidate)) {
      return candidate;
    }
  }
  return inheritedDeprecated;
}

function warnCaseCollision(
  seen: Map<string, string>,
  name: string,
  onWarn?: (msg: string) => void,
  context?: string,
): void {
  const lower = name.toLowerCase();
  const existing = seen.get(lower);
  if (existing && existing !== name && onWarn) {
    const scope = context ? `${context} ` : '';
    onWarn(
      `${scope}contains names that differ only by case: ${existing} vs ${name}`,
    );
  } else if (!existing) {
    seen.set(lower, name);
  }
}

function isTokenCollection(value: unknown): value is TokenGroup {
  return isRecord(value) && !isToken(value);
}

function isDeprecationMetadata(value: unknown): value is DeprecationMetadata {
  if (typeof value === 'boolean') return true;
  if (!isRecord(value)) return false;
  if (!('$replacement' in value)) return false;
  const replacement = value.$replacement;
  return typeof replacement === 'string';
}

interface BuildTokenOptions {
  getLoc?: (path: string) => { line: number; column: number };
  inheritedType?: string;
  inheritedDeprecated?: DeprecationMetadata;
}

function buildToken(
  token: Token,
  pointer: string,
  options: BuildTokenOptions = {},
): FlattenedToken {
  const { getLoc, inheritedType, inheritedDeprecated } = options;
  const loc = getLocation(pointer, getLoc);
  tokenLocations.set(pointer, loc);
  const explicitType = token.$type;
  const type = typeof explicitType === 'string' ? explicitType : inheritedType;
  const deprecated = token.$deprecated;

  const flattened: FlattenedToken = {
    path: pointer,
    value: token.$value,
    type,
    metadata: {
      description: token.$description,
      extensions: token.$extensions,
      deprecated: isDeprecationMetadata(deprecated)
        ? deprecated
        : inheritedDeprecated,
      loc,
    },
  };

  if (typeof token.$ref === 'string') {
    flattened.ref = token.$ref;
  }

  return flattened;
}

function walkCollection(
  collection: TokenGroup,
  segments: string[],
  tokens: FlattenedToken[],
  getLoc?: (path: string) => { line: number; column: number },
  onWarn?: (msg: string) => void,
  inheritedDeprecated?: DeprecationMetadata,
  inheritedType?: string,
): void {
  const seenNames = new Map<string, string>();
  const context = segments.length ? toPointer(segments) : 'root collection';
  const collectionDeprecated = getCollectionDeprecated(
    collection,
    inheritedDeprecated,
  );
  const collectionType = getCollectionType(collection, inheritedType);

  for (const [rawName, node] of Object.entries(collection)) {
    if (rawName.startsWith('$')) continue;
    warnCaseCollision(seenNames, rawName, onWarn, context);
    if (isToken(node)) {
      const pointer = toPointer([...segments, rawName]);
      const flattened = buildToken(node, pointer, {
        getLoc,
        inheritedDeprecated: collectionDeprecated,
        inheritedType: collectionType,
      });
      tokens.push(flattened);
      continue;
    }

    if (!isTokenCollection(node)) continue;

    const nextSegments = [...segments, rawName];

    walkCollection(
      node,
      nextSegments,
      tokens,
      getLoc,
      onWarn,
      getCollectionDeprecated(node, collectionDeprecated),
      getCollectionType(node, collectionType),
    );
  }
}

export function buildParseTree(
  tokens: DesignTokens,
  getLoc?: (path: string) => { line: number; column: number },
  onWarn?: (msg: string) => void,
): FlattenedToken[] {
  tokenLocations.clear();
  const flattened: FlattenedToken[] = [];
  walkCollection(tokens, [], flattened, getLoc, onWarn);
  return flattened;
}
