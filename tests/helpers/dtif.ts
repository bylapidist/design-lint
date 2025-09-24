import type {
  DesignTokens,
  DtifFlattenedToken,
  TokenMetadata,
  TokenResolution,
} from '../../src/core/types.js';
import { attachDtifFlattenedTokens } from '../../src/utils/tokens/dtif-cache.js';

export interface DtifTokenInit {
  type?: string;
  value?: unknown;
  metadata?: TokenMetadata;
  resolution?: TokenResolution;
}

export function createDtifTheme(
  entries: Record<string, DtifTokenInit>,
  overrides: Partial<DesignTokens> = {},
): DesignTokens {
  const document = { $version: '1.0.0', ...overrides } as DesignTokens;
  for (const [path, init] of Object.entries(entries)) {
    applyTokenToDocument(document, path, init);
  }
  const flattened = Object.entries(entries).map(([path, init]) =>
    createDtifToken(path, init),
  );
  attachDtifFlattenedTokens(document, flattened);
  return document;
}

export function createDtifToken(
  path: string,
  init: DtifTokenInit,
): DtifFlattenedToken {
  const segments = path.split('.');
  return {
    pointer: toPointer(segments),
    segments,
    name: segments[segments.length - 1] ?? '',
    type: init.type,
    value: init.value,
    metadata: init.metadata ?? {},
    resolution: init.resolution,
  } satisfies DtifFlattenedToken;
}

function toPointer(segments: readonly string[]): string {
  if (segments.length === 0) {
    return '#';
  }
  const encoded = segments.map(encodePointerSegment).join('/');
  return `#/${encoded}`;
}

function encodePointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function applyTokenToDocument(
  document: DesignTokens,
  path: string,
  init: DtifTokenInit,
): void {
  const segments = path.split('.');
  if (segments.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> = document;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const existing = cursor[segment];
    if (!isRecord(existing) || isTokenNode(existing)) {
      const collection: Record<string, unknown> = {};
      cursor[segment] = collection;
      cursor = collection;
      continue;
    }
    cursor = existing;
  }

  const leaf = segments[segments.length - 1];
  cursor[leaf] = createTokenNode(init);
}

function createTokenNode(init: DtifTokenInit): Record<string, unknown> {
  const node: Record<string, unknown> = {};
  if (init.type !== undefined) {
    node.$type = init.type;
  }
  if (init.value !== undefined) {
    node.$value = init.value;
  }
  applyTokenMetadata(node, init.metadata);
  return node;
}

function applyTokenMetadata(
  target: Record<string, unknown>,
  metadata: TokenMetadata | undefined,
): void {
  if (!metadata) {
    return;
  }
  if (metadata.description !== undefined) {
    target.$description = metadata.description;
  }
  if (metadata.extensions) {
    target.$extensions = metadata.extensions;
  }
  if (metadata.deprecated !== undefined) {
    target.$deprecated = metadata.deprecated;
  }
  if (metadata.lastModified !== undefined) {
    target.$lastModified = metadata.lastModified;
  }
  if (metadata.lastUsed !== undefined) {
    target.$lastUsed = metadata.lastUsed;
  }
  if (metadata.usageCount !== undefined) {
    target.$usageCount = metadata.usageCount;
  }
  if (metadata.author !== undefined) {
    target.$author = metadata.author;
  }
  if (metadata.tags !== undefined) {
    target.$tags = metadata.tags;
  }
  if (metadata.hash !== undefined) {
    target.$hash = metadata.hash;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTokenNode(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && ('$value' in value || '$ref' in value);
}
