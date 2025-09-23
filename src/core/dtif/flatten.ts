import type {
  GraphAliasNode,
  GraphNode,
  GraphTokenNode,
  NodeMetadata,
  ParseResult,
  ResolvedToken,
} from '@lapidist/dtif-parser';
import { normalizeJsonPointer } from '@lapidist/dtif-parser';
import type { ReplacementTokenPointer } from '@lapidist/dtif-schema';
import { collectTokenDiagnostics, createTokenLocation } from './session.js';
import type {
  DtifFlattenedToken,
  TokenDiagnostic,
  TokenExtensions,
  TokenMetadata,
  TokenResolution,
} from '../types.js';

export interface FlattenDtifOptions {
  onDiagnostic?: (diagnostic: TokenDiagnostic) => void;
  warn?: (message: string) => void;
}

export interface FlattenDtifResult {
  tokens: DtifFlattenedToken[];
  diagnostics: TokenDiagnostic[];
}

export function flattenDtifDocument(
  result: ParseResult,
  options: FlattenDtifOptions = {},
): FlattenDtifResult {
  const diagnostics: TokenDiagnostic[] = [];
  const tokens: DtifFlattenedToken[] = [];

  const { warn, onDiagnostic } = options;

  const forwardDiagnostic = (diagnostic: TokenDiagnostic): void => {
    diagnostics.push(diagnostic);
    onDiagnostic?.(diagnostic);
    if (warn && diagnostic.severity !== 'error') {
      warn(formatDiagnosticMessage(diagnostic));
    }
  };

  for (const diagnostic of collectTokenDiagnostics(result.diagnostics)) {
    forwardDiagnostic(diagnostic);
  }

  const { graph, resolver } = result;
  if (!graph || !resolver) {
    return { tokens, diagnostics };
  }

  const nodes = Array.from(graph.nodes.values()).filter(isFlattenableNode);
  nodes.sort((a, b) => a.pointer.localeCompare(b.pointer));

  for (const node of nodes) {
    const pointer = node.pointer;
    const resolution = resolver.resolve(pointer);
    for (const diagnostic of collectTokenDiagnostics(resolution.diagnostics)) {
      forwardDiagnostic(diagnostic);
    }

    const resolved = resolution.token;
    if (resolved) {
      for (const diagnostic of collectTokenDiagnostics(resolved.warnings)) {
        forwardDiagnostic(diagnostic);
      }
    }

    const baseType = getNodeType(node);
    const baseValue = getNodeValue(node);
    const finalType = resolved?.type ?? baseType;
    const finalValue = resolved?.value ?? baseValue;

    tokens.push({
      pointer,
      segments: node.path,
      name: node.name,
      type: finalType,
      value: finalValue,
      metadata: createTokenMetadata(node.metadata),
      resolution: toTokenResolution(resolved),
      location: createTokenLocation(pointer, node.span),
    });
  }

  return { tokens, diagnostics };
}

function isFlattenableNode(
  node: GraphNode,
): node is GraphTokenNode | GraphAliasNode {
  return node.kind === 'token' || node.kind === 'alias';
}

function getNodeType(
  node: GraphTokenNode | GraphAliasNode,
): string | undefined {
  if (node.kind === 'alias') {
    return node.type.value;
  }
  return node.type?.value;
}

function getNodeValue(node: GraphTokenNode | GraphAliasNode): unknown {
  if (node.kind === 'alias') {
    return undefined;
  }
  return node.value?.value;
}

function createTokenMetadata(metadata: NodeMetadata): TokenMetadata {
  const result: TokenMetadata = {};

  if (typeof metadata.description?.value === 'string') {
    result.description = metadata.description.value;
  }

  const extensions = metadata.extensions?.value;
  if (isExtensionsMap(extensions)) {
    result.extensions = toMutableExtensions(extensions);
  }

  const deprecated = metadata.deprecated?.value;
  const formattedDeprecated = formatDeprecatedMetadata(deprecated);
  if (formattedDeprecated !== undefined) {
    result.deprecated = formattedDeprecated;
  }

  if (typeof metadata.lastModified?.value === 'string') {
    result.lastModified = metadata.lastModified.value;
  }

  if (typeof metadata.lastUsed?.value === 'string') {
    result.lastUsed = metadata.lastUsed.value;
  }

  const usageCount = metadata.usageCount?.value;
  if (typeof usageCount === 'number' && Number.isFinite(usageCount)) {
    result.usageCount = usageCount;
  }

  if (typeof metadata.author?.value === 'string') {
    result.author = metadata.author.value;
  }

  const tags = metadata.tags?.value;
  if (Array.isArray(tags) && tags.every((tag) => typeof tag === 'string')) {
    result.tags = [...tags];
  }

  if (typeof metadata.hash?.value === 'string') {
    result.hash = metadata.hash.value;
  }

  return result;
}

function isExtensionsMap(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function toMutableExtensions(
  value: Readonly<Record<string, unknown>>,
): TokenExtensions {
  const extensions: TokenExtensions = {};
  for (const [key, entryValue] of Object.entries(value)) {
    extensions[key] = entryValue;
  }
  return extensions;
}

function formatDeprecatedMetadata(value: unknown): TokenMetadata['deprecated'] {
  if (!isRecord(value)) {
    return undefined;
  }

  const active = value.active;
  if (typeof active !== 'boolean') {
    return undefined;
  }

  if (isRecord(value.replacement)) {
    const replacement = createReplacementPointer(value.replacement.value);
    if (replacement !== undefined) {
      const metadata: TokenMetadata['deprecated'] = {
        $replacement: replacement,
      };
      return metadata;
    }
  }

  return active;
}

function createReplacementPointer(
  value: unknown,
): ReplacementTokenPointer | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = normalizeJsonPointer(value);
  return isReplacementPointer(normalized) ? normalized : undefined;
}

function isReplacementPointer(
  value: unknown,
): value is ReplacementTokenPointer {
  return typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toTokenResolution(
  resolved: ResolvedToken | undefined,
): TokenResolution | undefined {
  if (!resolved) {
    return undefined;
  }

  return {
    pointer: resolved.pointer,
    uri: resolved.uri,
    type: resolved.type,
    value: resolved.value,
    source: resolved.source,
    overridesApplied: resolved.overridesApplied,
    warnings: resolved.warnings,
    trace: resolved.trace,
  };
}

function formatDiagnosticMessage(diagnostic: TokenDiagnostic): string {
  const labelParts = [
    'DTIF',
    diagnostic.severity.toUpperCase(),
    diagnostic.code,
  ];
  const parts = [`[${labelParts.join(' ')}]`, diagnostic.message];
  if (diagnostic.pointer) {
    parts.push(`(${diagnostic.pointer})`);
  }
  return parts.join(' ');
}
