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
  const document = { $version: '1.0.0', ...overrides } satisfies DesignTokens;
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
    id: toPointer(segments),
    pointer: toPointer(segments),
    path: segments,
    name: segments[segments.length - 1] ?? '',
    type: init.type,
    value: init.value,
    raw: init.value,
    metadata: normalizeMetadata(init.metadata),
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
  if (Object.keys(metadata.extensions).length > 0) {
    target.$extensions = { ...metadata.extensions };
  }
  if (metadata.deprecated) {
    const superseded = metadata.deprecated.supersededBy?.pointer;
    if (superseded) {
      target.$deprecated = { $ref: superseded };
    } else if (metadata.deprecated.reason) {
      target.$deprecated = metadata.deprecated.reason;
    } else {
      target.$deprecated = true;
    }
  }
}

function normalizeMetadata(metadata: TokenMetadata | undefined): TokenMetadata {
  if (!metadata) {
    return { extensions: {} };
  }
  return {
    ...metadata,
    extensions: { ...metadata.extensions },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTokenNode(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && ('$value' in value || '$ref' in value);
}
