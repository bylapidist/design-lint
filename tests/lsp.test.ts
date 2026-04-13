/**
 * Tests for @lapidist/design-lint-lsp createLSPServer.
 *
 * Uses PassThrough streams to simulate JSON-RPC 2.0 stdio communication
 * without spawning a child process.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createLSPServer } from '../packages/lsp/src/index.js';
import type { Linter, LintMessage, LintResult } from '../src/index.js';

// ---------------------------------------------------------------------------
// Wire protocol helpers
// ---------------------------------------------------------------------------

function encodeRpc(body: unknown): Buffer {
  const json = JSON.stringify(body);
  const bodyBuf = Buffer.from(json, 'utf8');
  const header = `Content-Length: ${bodyBuf.byteLength.toString()}\r\n\r\n`;
  return Buffer.concat([Buffer.from(header, 'ascii'), bodyBuf]);
}

function decodeRpcFrames(buf: Buffer): unknown[] {
  const frames: unknown[] = [];
  let remaining = buf;

  while (remaining.length > 0) {
    const headerEnd = remaining.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = remaining.subarray(0, headerEnd).toString('utf8');
    const clMatch = /Content-Length:\s*(\d+)/i.exec(header);
    if (!clMatch?.[1]) break;

    const contentLength = parseInt(clMatch[1], 10);
    const bodyStart = headerEnd + 4;
    if (remaining.length < bodyStart + contentLength) break;

    const body = remaining
      .subarray(bodyStart, bodyStart + contentLength)
      .toString('utf8');
    remaining = remaining.subarray(bodyStart + contentLength);
    frames.push(JSON.parse(body) as unknown);
  }

  return frames;
}

function collectOutput(stream: PassThrough): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

async function runLSP(messages: unknown[], linter: Linter): Promise<unknown[]> {
  const input = new PassThrough();
  const output = new PassThrough();

  const server = createLSPServer(linter);
  server.start(input, output);

  for (const msg of messages) {
    input.write(encodeRpc(msg));
  }
  input.end();

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });
  output.end();

  const buf = await collectOutput(output);
  return decodeRpcFrames(buf);
}

// ---------------------------------------------------------------------------
// Mock linter
// ---------------------------------------------------------------------------

interface MockLinterOptions {
  messages?: LintMessage[];
  tokenCompletions?: Record<string, string[]>;
}

function makeResult(messages: LintMessage[]): LintResult {
  return {
    sourceId: 'mock',
    messages,
  };
}

function makeMockLinter(opts: MockLinterOptions = {}): Linter {
  return {
    lintDocument: () => Promise.resolve(makeResult(opts.messages ?? [])),
    lintSnippet: () => Promise.resolve(makeResult([])),
    getTokenCompletions: () => opts.tokenCompletions ?? {},
  } as unknown as Linter;
}

// ---------------------------------------------------------------------------
// capabilities
// ---------------------------------------------------------------------------

void test('createLSPServer exposes capabilities object', () => {
  const server = createLSPServer(makeMockLinter());
  const caps = server.capabilities;
  assert.ok('textDocumentSync' in caps);
  assert.ok('codeActionProvider' in caps);
  assert.ok('completionProvider' in caps);
  assert.ok('hoverProvider' in caps);
});

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------

void test('LSP initialize returns server capabilities', async () => {
  const frames = await runLSP(
    [{ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }],
    makeMockLinter(),
  );

  const response = frames.find(
    (f): f is { id: number; result: Record<string, unknown> } =>
      typeof f === 'object' && f !== null && 'result' in f,
  );
  assert.ok(response !== undefined, 'should receive a response');
  assert.equal(response.id, 1);
  assert.ok('capabilities' in response.result);
});

// ---------------------------------------------------------------------------
// shutdown
// ---------------------------------------------------------------------------

void test('LSP shutdown responds with null result', async () => {
  const frames = await runLSP(
    [{ jsonrpc: '2.0', id: 99, method: 'shutdown', params: null }],
    makeMockLinter(),
  );

  const response = frames.find(
    (f): f is { id: number; result: null } =>
      typeof f === 'object' && f !== null && 'id' in f,
  );
  assert.ok(response !== undefined);
  assert.equal(response.id, 99);
  assert.equal(response.result, null);
});

// ---------------------------------------------------------------------------
// textDocument/didOpen
// ---------------------------------------------------------------------------

void test('LSP textDocument/didOpen publishes diagnostics notification', async () => {
  const msg: LintMessage = {
    ruleId: 'design-token/colors',
    severity: 'error',
    message: 'Use a design token',
    line: 1,
    column: 1,
  };
  const frames = await runLSP(
    [
      {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri: 'file:///test.css',
            text: 'a { color: red; }',
            languageId: 'css',
            version: 1,
          },
        },
      },
    ],
    makeMockLinter({ messages: [msg] }),
  );

  const notification = frames.find(
    (
      f,
    ): f is {
      method: string;
      params: { uri: string; diagnostics: unknown[] };
    } =>
      typeof f === 'object' &&
      f !== null &&
      'method' in f &&
      (f as { method: string }).method === 'textDocument/publishDiagnostics',
  );
  assert.ok(notification !== undefined, 'should receive publishDiagnostics');
  assert.equal(notification.params.uri, 'file:///test.css');
  assert.equal(notification.params.diagnostics.length, 1);
});

void test('LSP textDocument/didOpen with no violations publishes empty diagnostics', async () => {
  const frames = await runLSP(
    [
      {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri: 'file:///clean.css',
            text: 'a { color: var(--color-primary); }',
            languageId: 'css',
            version: 1,
          },
        },
      },
    ],
    makeMockLinter({ messages: [] }),
  );

  const notification = frames.find(
    (f): f is { method: string; params: { diagnostics: unknown[] } } =>
      typeof f === 'object' &&
      f !== null &&
      'method' in f &&
      (f as { method: string }).method === 'textDocument/publishDiagnostics',
  );
  assert.ok(notification !== undefined);
  assert.equal(notification.params.diagnostics.length, 0);
});

// ---------------------------------------------------------------------------
// textDocument/didClose
// ---------------------------------------------------------------------------

void test('LSP textDocument/didClose clears diagnostics', async () => {
  const frames = await runLSP(
    [
      {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri: 'file:///close.css',
            text: 'a { color: red; }',
            languageId: 'css',
            version: 1,
          },
        },
      },
      {
        jsonrpc: '2.0',
        method: 'textDocument/didClose',
        params: { textDocument: { uri: 'file:///close.css' } },
      },
    ],
    makeMockLinter(),
  );

  const notifications = frames.filter(
    (f): f is { method: string; params: { diagnostics: unknown[] } } =>
      typeof f === 'object' &&
      f !== null &&
      'method' in f &&
      (f as { method: string }).method === 'textDocument/publishDiagnostics',
  );
  const last = notifications.at(-1);
  assert.ok(last !== undefined);
  assert.equal(last.params.diagnostics.length, 0);
});

// ---------------------------------------------------------------------------
// workspace/tokenDependencyGraph
// ---------------------------------------------------------------------------

void test('LSP workspace/tokenDependencyGraph returns dependency graph', async () => {
  const frames = await runLSP(
    [
      {
        jsonrpc: '2.0',
        id: 5,
        method: 'workspace/tokenDependencyGraph',
        params: {},
      },
    ],
    makeMockLinter(),
  );

  const response = frames.find(
    (f): f is { id: number; result: Record<string, unknown> } =>
      typeof f === 'object' && f !== null && 'result' in f,
  );
  assert.ok(response !== undefined);
  assert.equal(response.id, 5);
  assert.ok('entries' in response.result);
});

// ---------------------------------------------------------------------------
// textDocument/completion
// ---------------------------------------------------------------------------

void test('LSP textDocument/completion returns token completions', async () => {
  const frames = await runLSP(
    [
      {
        jsonrpc: '2.0',
        id: 6,
        method: 'textDocument/completion',
        params: {
          textDocument: { uri: 'file:///style.css' },
          position: { line: 0, character: 10 },
        },
      },
    ],
    makeMockLinter({
      tokenCompletions: { color: ['color.primary', 'color.secondary'] },
    }),
  );

  const response = frames.find(
    (f): f is { id: number; result: { items: unknown[] } } =>
      typeof f === 'object' && f !== null && 'result' in f,
  );
  assert.ok(response !== undefined);
  assert.ok('items' in response.result);
  assert.ok(Array.isArray(response.result.items));
  assert.ok(response.result.items.length >= 2);
});

// ---------------------------------------------------------------------------
// textDocument/codeAction
// ---------------------------------------------------------------------------

void test('LSP textDocument/codeAction returns empty array for unknown doc', async () => {
  const frames = await runLSP(
    [
      {
        jsonrpc: '2.0',
        id: 7,
        method: 'textDocument/codeAction',
        params: {
          textDocument: { uri: 'file:///unknown.css' },
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          context: { diagnostics: [] },
        },
      },
    ],
    makeMockLinter(),
  );

  const response = frames.find(
    (f): f is { id: number; result: unknown[] } =>
      typeof f === 'object' && f !== null && 'result' in f,
  );
  assert.ok(response !== undefined);
  assert.ok(Array.isArray(response.result));
  assert.equal(response.result.length, 0);
});

// ---------------------------------------------------------------------------
// Unknown method
// ---------------------------------------------------------------------------

void test('LSP responds with -32601 for unknown method', async () => {
  const frames = await runLSP(
    [{ jsonrpc: '2.0', id: 8, method: 'unknown/method', params: {} }],
    makeMockLinter(),
  );

  const response = frames.find(
    (f): f is { id: number; error: { code: number } } =>
      typeof f === 'object' && f !== null && 'error' in f,
  );
  assert.ok(response !== undefined);
  assert.equal(response.error.code, -32601);
});

// ---------------------------------------------------------------------------
// initialized notification (produces no response)
// ---------------------------------------------------------------------------

void test('LSP initialized notification produces no response of its own', async () => {
  const frames = await runLSP(
    [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
      { jsonrpc: '2.0', method: 'initialized', params: {} },
    ],
    makeMockLinter(),
  );

  const responses = frames.filter(
    (f) => typeof f === 'object' && f !== null && 'result' in f,
  );
  // Only the initialize response should arrive
  assert.equal(responses.length, 1);
});

// ---------------------------------------------------------------------------
// textDocument/didChange
// ---------------------------------------------------------------------------

void test('LSP textDocument/didChange re-lints and publishes updated diagnostics', async () => {
  const frames = await runLSP(
    [
      {
        jsonrpc: '2.0',
        method: 'textDocument/didChange',
        params: {
          textDocument: { uri: 'file:///changed.css', version: 2 },
          contentChanges: [{ text: 'a { color: red; }' }],
        },
      },
    ],
    makeMockLinter(),
  );

  const notification = frames.find(
    (f): f is { method: string; params: unknown } =>
      typeof f === 'object' &&
      f !== null &&
      'method' in f &&
      (f as { method: string }).method === 'textDocument/publishDiagnostics',
  );
  assert.ok(
    notification !== undefined,
    'didChange should trigger publishDiagnostics',
  );
});
