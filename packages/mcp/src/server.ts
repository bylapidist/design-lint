import type { Linter } from '@lapidist/design-lint';
import { handleLintSnippet } from './tools/lint-snippet.js';
import { handleTokenCompletions } from './tools/token-completions.js';
import { handleValidateComponent } from './tools/validate-component.js';
import { handleExplainDiagnostic } from './tools/explain-diagnostic.js';
import type {
  LintSnippetParams,
  TokenCompletionParams,
  MCPFileType,
} from './types.js';

const SERVER_NAME = 'design-lint-mcp';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

const CONTENT_LENGTH_HEADER = 'Content-Length';
const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_TYPE_VALUE = 'application/vscode-jsonrpc; charset=utf-8';

// ---------- Type guards (no `as` casts allowed) ----------

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function parseRpcId(val: unknown): number | string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' || typeof val === 'string') return val;
  return null;
}

interface RpcRequest {
  jsonrpc: string;
  id: number | string | null;
  method: string;
  params: unknown;
}

function isRpcRequest(val: unknown): val is RpcRequest {
  if (!isRecord(val)) return false;
  if (val['jsonrpc'] !== '2.0') return false;
  if (typeof val['method'] !== 'string') return false;
  return true;
}

function isLintSnippetParams(val: unknown): val is LintSnippetParams {
  if (!isRecord(val)) return false;
  if (typeof val['code'] !== 'string') return false;
  if (typeof val['fileType'] !== 'string') return false;
  return true;
}

function isTokenCompletionParams(val: unknown): val is TokenCompletionParams {
  if (!isRecord(val)) return false;
  if (typeof val['cssProperty'] !== 'string') return false;
  return true;
}

function isValidateComponentArgs(
  val: unknown,
): val is { code: string; fileType: MCPFileType } {
  if (!isRecord(val)) return false;
  if (typeof val['code'] !== 'string') return false;
  if (typeof val['fileType'] !== 'string') return false;
  return true;
}

function isExplainDiagnosticArgs(val: unknown): val is { ruleId: string } {
  if (!isRecord(val)) return false;
  if (typeof val['ruleId'] !== 'string') return false;
  return true;
}

function isToolCallParams(val: unknown): val is { name: string; arguments: unknown } {
  if (!isRecord(val)) return false;
  if (typeof val['name'] !== 'string') return false;
  return true;
}

// ---------- Response helpers ----------

interface RpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function writeResponse(response: RpcResponse): void {
  const body = JSON.stringify(response);
  const header =
    `${CONTENT_LENGTH_HEADER}: ${Buffer.byteLength(body, 'utf8')}\r\n` +
    `${CONTENT_TYPE_HEADER}: ${CONTENT_TYPE_VALUE}\r\n\r\n`;
  process.stdout.write(header + body);
}

function successResponse(id: number | string | null, result: unknown): RpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function errorResponse(
  id: number | string | null,
  code: number,
  message: string,
): RpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// ---------- Tool definitions ----------

const TOOL_DEFINITIONS = [
  {
    name: 'lint_snippet',
    description:
      'Lint a code snippet for design token violations using the convergence protocol. ' +
      'Applies high-confidence fixes automatically and returns corrected code.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code snippet to lint.' },
        fileType: {
          type: 'string',
          enum: ['css', 'tsx', 'ts', 'vue', 'svelte'],
          description: 'File type to lint as.',
        },
        agentId: {
          type: 'string',
          description: 'AI agent identifier for telemetry attribution.',
        },
        withSuggestions: {
          type: 'boolean',
          description: 'Include ranked correction suggestions.',
        },
        iterationDepth: {
          type: 'number',
          description: 'Maximum correction iterations (default: 3).',
        },
      },
      required: ['code', 'fileType'],
    },
  },
  {
    name: 'get_token_completions',
    description:
      'Return design token completions for a given CSS property. ' +
      'Useful for AI agents generating design-token-compliant code.',
    inputSchema: {
      type: 'object',
      properties: {
        cssProperty: {
          type: 'string',
          description: 'The CSS property to complete for (e.g. color, font-size).',
        },
        partialValue: {
          type: 'string',
          description: 'Optional partial value to filter completions.',
        },
        fileContext: {
          type: 'string',
          description: 'Optional surrounding file context to improve ranking.',
        },
      },
      required: ['cssProperty'],
    },
  },
  {
    name: 'validate_component_usage',
    description:
      'Validate that a component uses design tokens correctly. ' +
      'Returns structured diagnostics for any non-compliant usages.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Component source code to validate.' },
        fileType: {
          type: 'string',
          enum: ['css', 'tsx', 'ts', 'vue', 'svelte'],
          description: 'File type.',
        },
      },
      required: ['code', 'fileType'],
    },
  },
  {
    name: 'explain_diagnostic',
    description:
      'Return a human-readable explanation of a design-lint diagnostic rule, ' +
      'including rationale and how to fix violations.',
    inputSchema: {
      type: 'object',
      properties: {
        ruleId: {
          type: 'string',
          description: 'The rule ID to explain (e.g. design-token/colors).',
        },
      },
      required: ['ruleId'],
    },
  },
] as const;

// ---------- Request handler ----------

async function handleRequest(
  linter: Linter,
  req: RpcRequest,
): Promise<RpcResponse> {
  const { id, method, params } = req;
  const rpcId = parseRpcId(id);

  if (method === 'initialize') {
    return successResponse(rpcId, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    });
  }

  if (method === 'tools/list') {
    return successResponse(rpcId, { tools: TOOL_DEFINITIONS });
  }

  if (method === 'tools/call') {
    if (!isToolCallParams(params)) {
      return errorResponse(rpcId, -32602, 'Invalid params: expected name and arguments');
    }
    return handleToolCall(linter, rpcId, params.name, params['arguments']);
  }

  // Notifications (no id, no response needed)
  if (method === 'notifications/initialized' || method === 'initialized') {
    return successResponse(rpcId, null);
  }

  return errorResponse(rpcId, -32601, `Method not found: ${method}`);
}

async function handleToolCall(
  linter: Linter,
  id: number | string | null,
  name: string,
  args: unknown,
): Promise<RpcResponse> {
  if (name === 'lint_snippet') {
    if (!isLintSnippetParams(args)) {
      return errorResponse(id, -32602, 'lint_snippet requires code and fileType');
    }
    const result = await handleLintSnippet(linter, args);
    return successResponse(id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
  }

  if (name === 'get_token_completions') {
    if (!isTokenCompletionParams(args)) {
      return errorResponse(id, -32602, 'get_token_completions requires cssProperty');
    }
    const result = handleTokenCompletions(linter, args);
    return successResponse(id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
  }

  if (name === 'validate_component_usage') {
    if (!isValidateComponentArgs(args)) {
      return errorResponse(id, -32602, 'validate_component_usage requires code and fileType');
    }
    const result = await handleValidateComponent(linter, args.code, args.fileType);
    return successResponse(id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
  }

  if (name === 'explain_diagnostic') {
    if (!isExplainDiagnosticArgs(args)) {
      return errorResponse(id, -32602, 'explain_diagnostic requires ruleId');
    }
    const result = handleExplainDiagnostic(args.ruleId);
    return successResponse(id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
  }

  return errorResponse(id, -32601, `Unknown tool: ${name}`);
}

// ---------- Stdio transport (Content-Length framed) ----------
// Uses Uint8Array throughout to avoid Buffer<T> generic mismatch in @types/node 25.

function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

function uint8ToString(arr: Uint8Array, start: number, end: number): string {
  return Buffer.from(arr.subarray(start, end)).toString('utf8');
}

function startStdioTransport(linter: Linter): void {
  let buffer: Uint8Array = new Uint8Array(0);

  process.stdin.on('data', (chunk: Uint8Array) => {
    buffer = concatUint8Arrays(buffer, chunk);
    buffer = processBuffer(linter, buffer);
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });
}

function processBuffer(linter: Linter, incoming: Uint8Array): Uint8Array {
  let buf = incoming;

  while (buf.length > 0) {
    const headerEnd = findHeaderEnd(buf);
    if (headerEnd === -1) break;

    const headerText = uint8ToString(buf, 0, headerEnd);
    const contentLength = parseContentLength(headerText);
    if (contentLength === null) break;

    const bodyStart = headerEnd + 4; // skip \r\n\r\n
    if (buf.length < bodyStart + contentLength) break;

    const body = uint8ToString(buf, bodyStart, bodyStart + contentLength);
    buf = buf.subarray(bodyStart + contentLength);

    dispatchMessage(linter, body);
  }

  return buf;
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
  const lines = header.split('\r\n');
  for (const line of lines) {
    if (line.toLowerCase().startsWith('content-length:')) {
      const value = line.slice('content-length:'.length).trim();
      const n = parseInt(value, 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }
  }
  return null;
}

function dispatchMessage(linter: Linter, body: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    writeResponse(errorResponse(null, -32700, 'Parse error'));
    return;
  }

  if (!isRpcRequest(parsed)) {
    writeResponse(errorResponse(null, -32600, 'Invalid Request'));
    return;
  }

  const rpcId = parseRpcId(parsed['id']);

  handleRequest(linter, parsed).then((response) => {
    // Don't write responses to notifications (id is null and method is a notification)
    const isNotification =
      parsed['id'] === undefined &&
      (parsed['method'] === 'initialized' ||
        parsed['method'] === 'notifications/initialized');
    if (!isNotification) {
      writeResponse(response);
    }
  }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    writeResponse(errorResponse(rpcId, -32603, `Internal error: ${message}`));
  });
}

// ---------- Public API ----------

export interface MCPServer {
  start(): void;
}

export function createMCPServer(linter: Linter): MCPServer {
  return {
    start() {
      startStdioTransport(linter);
    },
  };
}
