import type {
  GraphAliasNode,
  GraphNode,
  GraphTokenNode,
  NodeMetadata,
  ResolvedToken,
  ResolutionTraceStep,
} from '@lapidist/dtif-parser';
import {
  diagnosticsArrayToMessages,
  toSourceLocation,
  type DtifDiagnosticMessage,
  type DtifJsonPointer,
  type DtifParseResult,
  type DtifResolvedToken,
} from './session.js';
import type { ResolvedTokenView } from '../types.js';

type GraphTokenLikeNode = GraphTokenNode | GraphAliasNode;

export interface ResolveDocumentTokensResult {
  readonly tokens: ResolvedTokenView[];
  readonly resolutionDiagnostics: DtifDiagnosticMessage[];
}

export function resolveDocumentTokens(
  result: DtifParseResult,
): ResolveDocumentTokensResult {
  const graph = result.graph;
  const resolver = result.resolver;
  if (!graph || !resolver) {
    return { tokens: [], resolutionDiagnostics: [] };
  }

  const tokens: ResolvedTokenView[] = [];
  const diagnostics: DtifDiagnosticMessage[] = [];

  for (const node of graph.nodes.values()) {
    if (!isTokenLikeNode(node)) continue;
    const resolution = resolver.resolve(node.pointer);
    const resolutionMessages = [
      ...diagnosticsArrayToMessages(resolution.diagnostics),
      ...diagnosticsArrayToMessages(resolution.token?.warnings ?? []),
    ];
    if (resolutionMessages.length > 0) {
      diagnostics.push(...resolutionMessages);
    }
    const resolvedToken = resolution.token;
    if (!resolvedToken) continue;
    tokens.push(mapResolvedTokenView(node, resolvedToken));
  }

  return { tokens, resolutionDiagnostics: diagnostics };
}

function isTokenLikeNode(node: GraphNode): node is GraphTokenLikeNode {
  return node.kind === 'token' || node.kind === 'alias';
}

function mapResolvedTokenView(
  node: GraphTokenLikeNode,
  token: DtifResolvedToken,
): ResolvedTokenView {
  const aliases = collectAliasPointers(node, token);
  return {
    pointer: token.pointer,
    value: token.value,
    type: token.type,
    aliases,
    metadata: mapTokenMetadata(node, token),
  } satisfies ResolvedTokenView;
}

function collectAliasPointers(
  node: GraphTokenLikeNode,
  token: DtifResolvedToken,
): DtifJsonPointer[] | undefined {
  const refs = new Set<DtifJsonPointer>();
  if (node.kind === 'alias') {
    refs.add(node.ref.value.pointer);
  } else {
    for (const step of token.trace) {
      if (isAliasTraceStep(step, token)) {
        refs.add(step.pointer);
      }
    }
  }
  if (refs.size === 0) return undefined;
  return Array.from(refs);
}

function isAliasTraceStep(
  step: ResolutionTraceStep,
  token: ResolvedToken,
): boolean {
  return step.kind === 'token' && step.pointer !== token.pointer;
}

function mapTokenMetadata(
  node: GraphTokenLikeNode,
  token: DtifResolvedToken,
): ResolvedTokenView['metadata'] {
  const metadata = node.metadata;
  return {
    description: metadata.description?.value,
    extensions: cloneExtensions(metadata),
    deprecated: mapDeprecated(metadata),
    source: toSourceLocation(node.span ?? token.source?.span),
  } satisfies ResolvedTokenView['metadata'];
}

function cloneExtensions(
  metadata: NodeMetadata,
): Record<string, unknown> | undefined {
  const extensions = metadata.extensions?.value;
  if (!extensions) return undefined;
  return Object.fromEntries(Object.entries(extensions));
}

function mapDeprecated(metadata: NodeMetadata): boolean | string | undefined {
  const deprecated = metadata.deprecated?.value;
  if (!deprecated?.active) return undefined;
  const replacement = deprecated.replacement?.value;
  return replacement ?? true;
}
