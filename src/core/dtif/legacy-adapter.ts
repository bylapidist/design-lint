import type {
  DtifFlattenedToken,
  FlattenedToken,
  JsonPointer,
} from '../types.js';

/**
 * Convert flattened DTIF tokens into the legacy flattened token structure used
 * by the current linter runtime. This adapter will be removed once the
 * migration to DTIF-native data structures completes.
 */
export function toLegacyFlattenedTokens(
  tokens: readonly DtifFlattenedToken[],
): FlattenedToken[] {
  return tokens.map(toLegacyFlattenedToken);
}

export function toLegacyFlattenedToken(
  token: DtifFlattenedToken,
): FlattenedToken {
  const path = joinSegments(token.segments);
  const metadata = createLegacyMetadata(token);
  const aliases = extractAliasPaths(token);

  return {
    path,
    value: token.value,
    type: token.type,
    ...(aliases ? { aliases } : {}),
    metadata,
  } satisfies FlattenedToken;
}

function createLegacyMetadata(
  token: DtifFlattenedToken,
): FlattenedToken['metadata'] {
  const base = token.metadata;
  const span = token.location?.span;
  const line = span?.start.line ?? 1;
  const column = span?.start.column ?? 1;

  return {
    description: base.description,
    extensions: cloneExtensions(base.extensions),
    deprecated: convertDeprecated(base.deprecated),
    loc: { line, column },
  } satisfies FlattenedToken['metadata'];
}

function cloneExtensions(
  extensions: DtifFlattenedToken['metadata']['extensions'],
): Record<string, unknown> | undefined {
  if (!extensions) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extensions)) {
    result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function convertDeprecated(
  deprecated: DtifFlattenedToken['metadata']['deprecated'],
): boolean | string | undefined {
  if (typeof deprecated === 'boolean') {
    return deprecated;
  }

  if (isRecord(deprecated) && typeof deprecated.$replacement === 'string') {
    return deprecated.$replacement;
  }

  return undefined;
}

function extractAliasPaths(token: DtifFlattenedToken): string[] | undefined {
  const trace = token.resolution?.trace;
  if (!trace) return undefined;

  const aliases = new Set<string>();
  for (const step of trace) {
    if (isAliasTargetStep(step, token.pointer)) {
      const path = pointerToLegacyPath(step.pointer);
      if (path) {
        aliases.add(path);
      }
    }
  }

  if (aliases.size === 0) {
    return undefined;
  }

  return Array.from(aliases);
}

type TraceStep = NonNullable<
  NonNullable<DtifFlattenedToken['resolution']>['trace']
>[number];

interface TokenTraceStep extends TraceStep {
  kind: 'token';
  pointer: JsonPointer;
}

function isAliasTargetStep(
  step: TraceStep,
  pointer: JsonPointer | undefined,
): step is TokenTraceStep {
  return step.kind === 'token' && step.pointer !== pointer;
}

export function pointerToLegacyPath(
  pointer: string | undefined,
): string | undefined {
  if (!pointer) return undefined;
  const segments = pointerToSegments(pointer);
  return segments.length > 0 ? joinSegments(segments) : undefined;
}

function pointerToSegments(pointer: string): readonly string[] {
  if (pointer === '#') {
    return [];
  }

  const fragment = pointer.startsWith('#') ? pointer.slice(1) : pointer;
  const trimmed = fragment.startsWith('/') ? fragment.slice(1) : fragment;
  if (!trimmed) return [];

  return trimmed.split('/').map(decodePointerSegment);
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function joinSegments(segments: readonly string[]): string {
  return segments.join('.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
