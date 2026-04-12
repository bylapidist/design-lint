/**
 * Design-lint Language Server Protocol server.
 *
 * Connects to a @lapidist/design-lint Linter instance and serves
 * LSP diagnostics, code actions, completions, and hover over stdio.
 *
 * Wire protocol: JSON-RPC 2.0 with Content-Length framing (same as MCP).
 */
import type { Linter, LintMessage } from '@lapidist/design-lint';
import type {
  LSPCapabilities,
  LSPDiagnostic,
  LSPCodeAction,
  LSPCompletion,
  LSPHover,
  LSPTokenDependencyGraph,
  LSPServerOptions,
} from './types.js';

// ---------------------------------------------------------------------------
// Re-export types so consumers can import from one place
// ---------------------------------------------------------------------------
export type {
  LSPCapabilities,
  LSPDiagnostic,
  LSPCodeAction,
  LSPCompletion,
  LSPHover,
  LSPTokenDependencyGraph,
  LSPServerOptions,
};

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const SERVER_NAME = 'design-lint-lsp';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '3.17.0';

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

interface RpcRequest {
  jsonrpc: string;
  id?: number | string | null;
  method: string;
  params?: unknown;
}

interface RpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface RpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

// ---------------------------------------------------------------------------
// Type guards (no `as` casts)
// ---------------------------------------------------------------------------

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isRpcRequest(val: unknown): val is RpcRequest {
  if (!isRecord(val)) return false;
  if (val.jsonrpc !== '2.0') return false;
  if (typeof val.method !== 'string') return false;
  return true;
}

function parseRpcId(val: unknown): number | string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' || typeof val === 'string') return val;
  return null;
}

function extractUri(params: unknown): string | null {
  if (!isRecord(params)) return null;
  const td = params.textDocument;
  if (!isRecord(td)) return null;
  const uri = td.uri;
  return typeof uri === 'string' ? uri : null;
}

function extractOpenText(params: unknown): string | null {
  if (!isRecord(params)) return null;
  const td = params.textDocument;
  if (!isRecord(td)) return null;
  const text = td.text;
  return typeof text === 'string' ? text : null;
}

function extractChangeText(params: unknown): string | null {
  if (!isRecord(params)) return null;
  const changes = params.contentChanges;
  if (!Array.isArray(changes) || changes.length === 0) return null;
  const first: unknown = changes[0];
  if (!isRecord(first)) return null;
  const text = first.text;
  return typeof text === 'string' ? text : null;
}

function extractPosition(
  params: unknown,
): { line: number; character: number } | null {
  if (!isRecord(params)) return null;
  const pos = params.position;
  if (!isRecord(pos)) return null;
  const line = pos.line;
  const character = pos.character;
  if (typeof line !== 'number' || typeof character !== 'number') return null;
  return { line, character };
}

function extractHoverTokenPath(params: unknown): string | null {
  if (!isRecord(params)) return null;
  const context = params.context;
  if (!isRecord(context)) return null;
  const path = context.tokenPath;
  return typeof path === 'string' ? path : null;
}

// ---------------------------------------------------------------------------
// IO helpers
// ---------------------------------------------------------------------------

function writeMessage(
  output: NodeJS.WritableStream,
  payload: RpcResponse | RpcNotification,
): void {
  const body = JSON.stringify(payload);
  const byteLen = Buffer.byteLength(body, 'utf8').toString();
  const header = `Content-Length: ${byteLen}\r\nContent-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n`;
  output.write(header + body);
}

function sendResponse(
  output: NodeJS.WritableStream,
  id: number | string | null,
  result: unknown,
): void {
  writeMessage(output, { jsonrpc: '2.0', id, result });
}

function sendError(
  output: NodeJS.WritableStream,
  id: number | string | null,
  code: number,
  message: string,
): void {
  writeMessage(output, { jsonrpc: '2.0', id, error: { code, message } });
}

function sendNotification(
  output: NodeJS.WritableStream,
  method: string,
  params?: unknown,
): void {
  const notification: RpcNotification = { jsonrpc: '2.0', method };
  if (params !== undefined) notification.params = params;
  writeMessage(output, notification);
}

// ---------------------------------------------------------------------------
// LSP capabilities
// ---------------------------------------------------------------------------

const CAPABILITIES: LSPCapabilities = {
  diagnostics: true,
  codeActions: true,
  completions: true,
  hover: true,
  tokenDependencyGraph: true,
};

function serverCapabilities(): Record<string, unknown> {
  return {
    textDocumentSync: {
      openClose: true,
      change: 1, // Full sync
    },
    diagnosticProvider: {
      interFileDependencies: false,
      workspaceDiagnostics: false,
    },
    codeActionProvider: {
      codeActionKinds: ['quickfix', 'refactor'],
    },
    completionProvider: {
      triggerCharacters: ['-', ' '],
    },
    hoverProvider: true,
  };
}

// ---------------------------------------------------------------------------
// Diagnostic conversion
// ---------------------------------------------------------------------------

function severityCode(severity: 'error' | 'warn'): 1 | 2 {
  return severity === 'warn' ? 2 : 1;
}

function messageToLSPDiagnostic(msg: LintMessage): LSPDiagnostic {
  const startLine = Math.max(0, msg.line - 1);
  const startChar = Math.max(0, msg.column - 1);
  return {
    ruleId: msg.ruleId,
    message: msg.message,
    severity: severityCode(msg.severity),
    range: {
      start: { line: startLine, character: startChar },
      end: { line: startLine, character: startChar + 1 },
    },
    codeActionKind: msg.fix ? 'quickfix' : undefined,
  };
}

function uriToFileType(uri: string): string {
  if (uri.endsWith('.css')) return 'css';
  if (uri.endsWith('.tsx')) return 'tsx';
  if (uri.endsWith('.ts')) return 'ts';
  if (uri.endsWith('.vue')) return 'vue';
  if (uri.endsWith('.svelte')) return 'svelte';
  return 'ts';
}

function tokenPathToCssVar(tokenPath: string): string {
  const varParts = tokenPath
    .split('.')
    .map((p: string) => p.replaceAll(/[^a-z0-9]/gi, '-').toLowerCase())
    .filter((p: string) => p.length > 0);
  return `var(--${varParts.join('-')})`;
}

// ---------------------------------------------------------------------------
// LSP Server state
// ---------------------------------------------------------------------------

interface DocumentState {
  text: string;
  diagnostics: LSPDiagnostic[];
  messages: LintMessage[];
}

// ---------------------------------------------------------------------------
// LSP Server implementation
// ---------------------------------------------------------------------------

export interface LSPServer {
  /**
   * Starts the server on the given stdio streams.
   * Defaults to process.stdin / process.stdout.
   */
  start(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream): void;
  /** Returns the server capabilities object (for testing). */
  readonly capabilities: LSPCapabilities;
}

export function createLSPServer(
  linter: Linter,
  options?: LSPServerOptions,
): LSPServer {
  // options is reserved for future connection configuration (kernel socket / URL)
  void options;

  const documents = new Map<string, DocumentState>();
  const dependencyGraph: LSPTokenDependencyGraph = { entries: {} };

  // -- Lint a document and publish diagnostics --------------------------------

  async function lintAndPublish(
    uri: string,
    text: string,
    output: NodeJS.WritableStream,
  ): Promise<void> {
    const fileType = uriToFileType(uri);
    const result = await linter.lintDocument(
      {
        id: uri,
        type: fileType,
        getText: () => Promise.resolve(text),
      },
      false,
    );
    const lspDiags = result.messages.map(messageToLSPDiagnostic);

    documents.set(uri, {
      text,
      diagnostics: lspDiags,
      messages: result.messages,
    });

    // Track rule ids referenced in this file as a proxy for token dependencies
    const tokenRefs = result.messages.map((m) => m.ruleId);
    dependencyGraph.entries[uri] = tokenRefs;

    sendNotification(output, 'textDocument/publishDiagnostics', {
      uri,
      diagnostics: lspDiags.map((d) => ({
        range: d.range,
        severity: d.severity,
        source: SERVER_NAME,
        message: d.message,
        code: d.ruleId,
      })),
    });
  }

  // -- Request handlers -------------------------------------------------------

  async function handleRequest(
    req: RpcRequest,
    output: NodeJS.WritableStream,
  ): Promise<void> {
    const id = parseRpcId(req.id);
    const { method, params } = req;
    const isNotification = req.id === undefined;

    switch (method) {
      case 'initialize': {
        sendResponse(output, id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: serverCapabilities(),
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        });
        return;
      }

      case 'initialized':
      case 'notifications/initialized': {
        // Notification — no response required
        return;
      }

      case 'shutdown': {
        sendResponse(output, id, null);
        return;
      }

      case 'exit': {
        process.exit(0);
        return; // unreachable — satisfies exhaustive-switch linters
      }

      case 'textDocument/didOpen': {
        const uri = extractUri(params);
        const text = extractOpenText(params);
        if (uri && text !== null) {
          await lintAndPublish(uri, text, output);
        }
        return;
      }

      case 'textDocument/didChange': {
        const uri = extractUri(params);
        const text = extractChangeText(params);
        if (uri && text !== null) {
          await lintAndPublish(uri, text, output);
        }
        return;
      }

      case 'textDocument/didClose': {
        const uri = extractUri(params);
        if (uri) {
          documents.delete(uri);
          const graph = dependencyGraph.entries;
          const newGraph: Record<string, string[]> = {};
          for (const [k, v] of Object.entries(graph)) {
            if (k !== uri) newGraph[k] = v;
          }
          dependencyGraph.entries = newGraph;
          sendNotification(output, 'textDocument/publishDiagnostics', {
            uri,
            diagnostics: [],
          });
        }
        return;
      }

      case 'textDocument/codeAction': {
        if (isNotification) return;
        const uri = extractUri(params);
        if (!uri) {
          sendError(output, id, -32602, 'Missing textDocument.uri');
          return;
        }
        const state = documents.get(uri);
        if (!state) {
          sendResponse(output, id, []);
          return;
        }
        const actions: LSPCodeAction[] = state.messages
          .filter((msg) => msg.fix !== undefined)
          .map((msg) => {
            const diag = messageToLSPDiagnostic(msg);
            return {
              title: `Fix: ${msg.ruleId}`,
              kind: 'quickfix' as const,
              documentUri: uri,
              edit: {
                range: diag.range,
                newText: msg.fix?.text ?? '',
              },
            };
          });
        sendResponse(output, id, actions);
        return;
      }

      case 'textDocument/completion': {
        if (isNotification) return;
        const position = extractPosition(params);
        const allCompletions = linter.getTokenCompletions();
        const items: LSPCompletion[] = [];
        for (const [, paths] of Object.entries(allCompletions)) {
          for (const tokenPath of paths) {
            const cssVar = tokenPathToCssVar(tokenPath);
            items.push({
              label: tokenPath.split('.').at(-1) ?? tokenPath,
              insertText: cssVar,
              detail: cssVar,
              preselect: position !== null,
            });
          }
        }
        sendResponse(output, id, { isIncomplete: false, items });
        return;
      }

      case 'textDocument/hover': {
        if (isNotification) return;
        const tokenPath = extractHoverTokenPath(params);
        if (!tokenPath) {
          sendResponse(output, id, null);
          return;
        }
        const cssVar = tokenPathToCssVar(tokenPath);
        const hover: LSPHover = {
          pointer: tokenPath,
          resolvedValue: cssVar,
          docsUrl: `https://github.com/bylapidist/design-lint/tree/main/docs/tokens/${tokenPath.replaceAll('.', '/')}.md`,
        };
        sendResponse(output, id, {
          contents: {
            kind: 'markdown',
            value: [
              `**Token:** \`${tokenPath}\``,
              `**Resolved value:** \`${hover.resolvedValue}\``,
              hover.docsUrl ? `[Documentation](${hover.docsUrl})` : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        });
        return;
      }

      case 'workspace/tokenDependencyGraph': {
        if (isNotification) return;
        sendResponse(output, id, dependencyGraph);
        return;
      }

      default: {
        if (!isNotification) {
          sendError(output, id, -32601, `Method not found: ${method}`);
        }
      }
    }
  }

  // -- Stdio transport (Content-Length framing) --------------------------------

  function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a);
    result.set(b, a.length);
    return result;
  }

  function findHeaderEnd(buf: Uint8Array): number {
    for (let i = 0; i < buf.length - 3; i++) {
      if (
        buf[i] === 0x0d &&
        buf[i + 1] === 0x0a &&
        buf[i + 2] === 0x0d &&
        buf[i + 3] === 0x0a
      ) {
        return i;
      }
    }
    return -1;
  }

  function parseContentLength(header: string): number | null {
    for (const line of header.split('\r\n')) {
      if (line.toLowerCase().startsWith('content-length:')) {
        const value = line.slice('content-length:'.length).trim();
        const n = parseInt(value, 10);
        return Number.isFinite(n) && n >= 0 ? n : null;
      }
    }
    return null;
  }

  function processBuffer(
    buf: Uint8Array,
    output: NodeJS.WritableStream,
  ): Uint8Array {
    let remaining = buf;
    while (remaining.length > 0) {
      const headerEnd = findHeaderEnd(remaining);
      if (headerEnd === -1) break;

      const headerText = Buffer.from(remaining.subarray(0, headerEnd)).toString(
        'utf8',
      );
      const contentLength = parseContentLength(headerText);
      if (contentLength === null) break;

      const bodyStart = headerEnd + 4;
      if (remaining.length < bodyStart + contentLength) break;

      const body = Buffer.from(
        remaining.subarray(bodyStart, bodyStart + contentLength),
      ).toString('utf8');
      remaining = remaining.subarray(bodyStart + contentLength);

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        sendError(output, null, -32700, 'Parse error');
        continue;
      }

      if (!isRpcRequest(parsed)) {
        sendError(output, null, -32600, 'Invalid Request');
        continue;
      }

      const msgId = parseRpcId(parsed.id);
      handleRequest(parsed, output).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        sendError(output, msgId, -32603, `Internal error: ${message}`);
      });
    }
    return remaining;
  }

  function start(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout,
  ): void {
    let buffer: Uint8Array = new Uint8Array(0);

    input.on('data', (chunk: Uint8Array) => {
      buffer = concatUint8Arrays(buffer, chunk);
      buffer = processBuffer(buffer, output);
    });

    input.on('end', () => {
      process.exit(0);
    });
  }

  return {
    start,
    get capabilities() {
      return CAPABILITIES;
    },
  };
}
