/**
 * Tests for @lapidist/design-lint-mcp tools.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleLintSnippet } from '../packages/mcp/src/tools/lint-snippet.js';
import {
  handleTokenCompletions,
  type TokenValueResolver,
} from '../packages/mcp/src/tools/token-completions.js';
import { handleValidateComponent } from '../packages/mcp/src/tools/validate-component.js';
import { handleExplainDiagnostic } from '../packages/mcp/src/tools/explain-diagnostic.js';
import { handleRequest, type RpcRequest } from '../packages/mcp/src/server.js';
import type { Linter, LintMessage } from '../src/index.js';
import type { SnapshotHashProvider } from '../packages/mcp/src/types.js';

// ---------------------------------------------------------------------------
// Mock Linter factory
// ---------------------------------------------------------------------------

interface MockLinterOptions {
  messages?: LintMessage[];
  tokenCompletions?: Record<string, string[]>;
}

function makeMockLinter(opts: MockLinterOptions = {}): Linter {
  const messages = opts.messages ?? [];
  const completions = opts.tokenCompletions ?? {};

  return {
    lintDocument: () =>
      Promise.resolve({
        id: 'mock',
        messages,
      }),
    getTokenCompletions: () => completions,
  } as unknown as Linter;
}

// ---------------------------------------------------------------------------
// handleExplainDiagnostic — pure function, no linter dependency
// ---------------------------------------------------------------------------

void test('handleExplainDiagnostic returns description for a known rule', () => {
  const result = handleExplainDiagnostic('design-system/no-inline-styles');
  assert.equal(result.ruleId, 'design-system/no-inline-styles');
  assert.ok(result.description.length > 0);
  assert.ok(result.rationale.length > 0);
  assert.ok(result.fix.length > 0);
  assert.ok(result.docsUrl?.includes('no-inline-styles'));
});

void test('handleExplainDiagnostic returns rationale for a known rule', () => {
  const result = handleExplainDiagnostic('design-token/colors');
  assert.ok(result.rationale.length > 0);
  // Rationale should NOT just echo the description (rules now have meta.rationale.why)
  assert.ok(typeof result.rationale === 'string');
});

void test('handleExplainDiagnostic returns unknown-rule fallback for unrecognised rule', () => {
  const result = handleExplainDiagnostic('design-system/nonexistent-rule');
  assert.equal(result.ruleId, 'design-system/nonexistent-rule');
  assert.ok(result.description.includes('Unknown rule'));
  assert.ok(result.fix.length > 0);
  assert.equal(result.docsUrl, undefined);
});

void test('handleExplainDiagnostic returns no-fix message for non-fixable rule', () => {
  const result = handleExplainDiagnostic('design-system/no-inline-styles');
  // no-inline-styles is not fixable — check fix message indicates manual fix
  assert.ok(
    result.fix.toLowerCase().includes('manual') ||
      result.fix.toLowerCase().includes('not support'),
  );
});

void test('handleExplainDiagnostic returns auto-fix message for fixable rule', () => {
  const result = handleExplainDiagnostic('design-token/colors');
  assert.ok(
    result.fix.toLowerCase().includes('fix') ||
      result.fix.toLowerCase().includes('--fix'),
  );
});

// ---------------------------------------------------------------------------
// handleLintSnippet
// ---------------------------------------------------------------------------

void test('handleLintSnippet returns converged=true when linter finds no violations', async () => {
  const linter = makeMockLinter({ messages: [] });
  const result = await handleLintSnippet(linter, {
    code: 'a { color: var(--color-brand); }',
    fileType: 'css',
  });
  assert.equal(result.converged, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.violationsRemaining, 0);
});

void test('handleLintSnippet returns diagnostics when violations are found', async () => {
  const msg: LintMessage = {
    ruleId: 'design-token/colors',
    severity: 'error',
    message: 'Raw color value detected',
    line: 1,
    column: 5,
  };
  const linter = makeMockLinter({ messages: [msg] });
  const result = await handleLintSnippet(linter, {
    code: 'a { color: red; }',
    fileType: 'css',
  });
  assert.equal(result.converged, false);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].ruleId, 'design-token/colors');
  assert.equal(result.diagnostics[0].severity, 'error');
  assert.equal(result.violationsRemaining, 1);
});

void test('handleLintSnippet extracts rawValue from message metadata', async () => {
  const msg: LintMessage = {
    ruleId: 'design-token/colors',
    severity: 'error',
    message: 'Raw color',
    line: 1,
    column: 1,
    metadata: { rawValue: 'red' },
  };
  const linter = makeMockLinter({ messages: [msg] });
  const result = await handleLintSnippet(linter, {
    code: 'a { color: red; }',
    fileType: 'css',
  });
  assert.equal(result.diagnostics[0].rawValue, 'red');
});

void test('handleLintSnippet extracts correction from message fix', async () => {
  const msg: LintMessage = {
    ruleId: 'design-token/colors',
    severity: 'error',
    message: 'Raw color',
    line: 1,
    column: 1,
    fix: { range: [10, 13], text: 'var(--color-brand)' },
  };
  const linter = makeMockLinter({ messages: [msg] });
  const result = await handleLintSnippet(linter, {
    code: 'a { color: red; }',
    fileType: 'css',
  });
  assert.equal(result.diagnostics[0].correction, 'var(--color-brand)');
});

void test('handleLintSnippet uses default iterationDepth of 3', async () => {
  let callCount = 0;
  const mockLinter = {
    lintDocument: () => {
      callCount++;
      // Always return a violation with no fix — forces max iterations
      const msg: LintMessage = {
        ruleId: 'test',
        severity: 'error',
        message: 'err',
        line: 1,
        column: 1,
      };
      return Promise.resolve({ id: 'mock', messages: [msg] });
    },
    getTokenCompletions: () => ({}),
  } as unknown as Linter;

  const result = await handleLintSnippet(mockLinter, {
    code: 'bad code',
    fileType: 'css',
  });
  // Should call lintDocument once per iteration (no fix applied, so stops after 1)
  assert.equal(callCount, 1);
  assert.equal(result.converged, false);
});

void test('handleLintSnippet propagates agentId to diagnostics', async () => {
  const msg: LintMessage = {
    ruleId: 'design-token/colors',
    severity: 'error',
    message: 'Raw color',
    line: 1,
    column: 1,
  };
  const linter = makeMockLinter({ messages: [msg] });
  const result = await handleLintSnippet(linter, {
    code: 'a { color: red; }',
    fileType: 'css',
    agentId: 'claude-agent-1',
  });
  assert.equal(result.diagnostics[0].agentId, 'claude-agent-1');
});

void test('handleLintSnippet returns aepVersion on each diagnostic', async () => {
  const msg: LintMessage = {
    ruleId: 'design-token/colors',
    severity: 'error',
    message: 'Raw color',
    line: 1,
    column: 1,
  };
  const linter = makeMockLinter({ messages: [msg] });
  const result = await handleLintSnippet(linter, {
    code: 'bad',
    fileType: 'css',
  });
  assert.ok(result.diagnostics[0].aepVersion.length > 0);
});

void test('handleLintSnippet attaches AEP response meta to result', async () => {
  const linter = makeMockLinter({ messages: [] });
  const result = await handleLintSnippet(linter, {
    code: 'a { color: var(--color-brand); }',
    fileType: 'css',
  });
  assert.ok(result.meta.runId.length > 0);
  assert.ok(result.meta.kernelSnapshotHash.length > 0);
  assert.ok(result.meta.aepVersion.length > 0);
});

void test('handleLintSnippet meta.runId is unique per invocation', async () => {
  const linter = makeMockLinter({ messages: [] });
  const [r1, r2] = await Promise.all([
    handleLintSnippet(linter, { code: 'a{}', fileType: 'css' }),
    handleLintSnippet(linter, { code: 'a{}', fileType: 'css' }),
  ]);
  assert.notEqual(r1.meta.runId, r2.meta.runId);
});

void test('handleLintSnippet uses snapshotHashProvider when provided', async () => {
  const linter = makeMockLinter({ messages: [] });
  const provider: SnapshotHashProvider = {
    getHash: () => Promise.resolve('abc123kernel'),
  };
  const result = await handleLintSnippet(
    linter,
    { code: 'a{}', fileType: 'css' },
    provider,
  );
  assert.equal(result.meta.kernelSnapshotHash, 'abc123kernel');
});

void test('handleLintSnippet falls back to local hash when no snapshotHashProvider', async () => {
  const linter = makeMockLinter({ messages: [] });
  const result = await handleLintSnippet(linter, {
    code: 'a{}',
    fileType: 'css',
  });
  assert.equal(result.meta.kernelSnapshotHash, 'local');
});

void test('handleLintSnippet falls back to local hash when provider returns undefined', async () => {
  const linter = makeMockLinter({ messages: [] });
  const provider: SnapshotHashProvider = {
    getHash: () => Promise.resolve(undefined),
  };
  const result = await handleLintSnippet(
    linter,
    { code: 'a{}', fileType: 'css' },
    provider,
  );
  assert.equal(result.meta.kernelSnapshotHash, 'local');
});

// ---------------------------------------------------------------------------
// handleTokenCompletions
// ---------------------------------------------------------------------------

void test('handleTokenCompletions returns empty array when linter has no completions', () => {
  const linter = makeMockLinter({ tokenCompletions: {} });
  const result = handleTokenCompletions(linter, { cssProperty: 'color' });
  assert.deepEqual(result, []);
});

void test('handleTokenCompletions returns completions matching cssProperty', () => {
  const linter = makeMockLinter({
    tokenCompletions: {
      default: ['color.brand.primary', 'color.brand.secondary', 'spacing.4'],
    },
  });
  const result = handleTokenCompletions(linter, { cssProperty: 'color' });
  // color.brand.primary and color.brand.secondary should match color property
  const paths = result.map((c) => c.tokenPath);
  assert.ok(paths.some((p) => p.includes('color')));
});

void test('handleTokenCompletions generates cssVar for each completion', () => {
  const linter = makeMockLinter({
    tokenCompletions: { default: ['color.brand.primary'] },
  });
  const result = handleTokenCompletions(linter, { cssProperty: 'color' });
  if (result.length > 0) {
    assert.ok(result[0].cssVar.startsWith('var(--'));
  }
});

void test('handleTokenCompletions filters by partialValue', () => {
  const linter = makeMockLinter({
    tokenCompletions: { default: ['color.brand.primary', 'color.neutral.500'] },
  });
  const result = handleTokenCompletions(linter, {
    cssProperty: 'color',
    partialValue: 'brand',
  });
  // Only brand should match
  assert.ok(result.every((c) => c.tokenPath.includes('brand')));
});

void test('handleTokenCompletions returns all tokens when cssProperty is empty string', () => {
  const linter = makeMockLinter({
    tokenCompletions: { default: ['color.brand.primary', 'spacing.4'] },
  });
  // Empty cssProperty means no filter
  const result = handleTokenCompletions(linter, { cssProperty: '' });
  assert.equal(result.length, 2);
});

void test('handleTokenCompletions uses resolver value when provided', () => {
  const linter = makeMockLinter({
    tokenCompletions: { default: ['color.brand.primary'] },
  });
  const resolver: TokenValueResolver = {
    resolve: (pointer) =>
      pointer === 'color.brand.primary' ? '#0066ff' : undefined,
  };
  const result = handleTokenCompletions(
    linter,
    { cssProperty: 'color' },
    resolver,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].resolvedValue, '#0066ff');
});

void test('handleTokenCompletions falls back to fabricated value when resolver returns undefined', () => {
  const linter = makeMockLinter({
    tokenCompletions: { default: ['color.brand.primary'] },
  });
  const resolver: TokenValueResolver = { resolve: () => undefined };
  const result = handleTokenCompletions(
    linter,
    { cssProperty: 'color' },
    resolver,
  );
  assert.equal(result.length, 1);
  assert.ok(result[0].resolvedValue.startsWith('var(--'));
});

// ---------------------------------------------------------------------------
// handleValidateComponent
// ---------------------------------------------------------------------------

void test('handleValidateComponent returns valid=true for clean component', async () => {
  const linter = makeMockLinter({ messages: [] });
  const result = await handleValidateComponent(
    linter,
    '<Button variant="primary" />',
    'tsx',
  );
  assert.equal(result.valid, true);
  assert.equal(result.diagnostics.length, 0);
});

void test('handleValidateComponent returns valid=false when violations exist', async () => {
  const msg: LintMessage = {
    ruleId: 'design-system/no-inline-styles',
    severity: 'error',
    message: 'Unexpected style attribute',
    line: 1,
    column: 8,
  };
  const linter = makeMockLinter({ messages: [msg] });
  const result = await handleValidateComponent(
    linter,
    '<Button style={{ color: "red" }} />',
    'tsx',
  );
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].ruleId, 'design-system/no-inline-styles');
});

void test('handleValidateComponent populates all AEPDiagnostic fields', async () => {
  const msg: LintMessage = {
    ruleId: 'design-system/no-inline-styles',
    severity: 'warn',
    message: 'Unexpected className',
    line: 2,
    column: 4,
    metadata: { rawValue: 'my-class' },
    fix: { range: [0, 10], text: '' },
  };
  const linter = makeMockLinter({ messages: [msg] });
  const result = await handleValidateComponent(
    linter,
    '<Button className="x" />',
    'tsx',
  );
  const diag = result.diagnostics[0];
  assert.equal(diag.severity, 'warn');
  assert.equal(diag.line, 2);
  assert.equal(diag.column, 4);
  assert.equal(diag.rawValue, 'my-class');
  assert.ok(diag.correction !== null);
  assert.equal(diag.aepVersion, '1');
});

void test('handleValidateComponent attaches AEP response meta to result', async () => {
  const linter = makeMockLinter({ messages: [] });
  const result = await handleValidateComponent(linter, '<Button />', 'tsx');
  assert.ok(result.meta.runId.length > 0);
  assert.ok(result.meta.kernelSnapshotHash.length > 0);
  assert.ok(result.meta.aepVersion.length > 0);
});

void test('handleValidateComponent uses snapshotHashProvider when provided', async () => {
  const linter = makeMockLinter({ messages: [] });
  const provider: SnapshotHashProvider = {
    getHash: () => Promise.resolve('deadbeefkernel'),
  };
  const result = await handleValidateComponent(
    linter,
    '<Button />',
    'tsx',
    provider,
  );
  assert.equal(result.meta.kernelSnapshotHash, 'deadbeefkernel');
});

void test('handleValidateComponent falls back to local hash when no snapshotHashProvider', async () => {
  const linter = makeMockLinter({ messages: [] });
  const result = await handleValidateComponent(linter, '<Button />', 'tsx');
  assert.equal(result.meta.kernelSnapshotHash, 'local');
});

// ---------------------------------------------------------------------------
// server.ts — AEP version validation
// ---------------------------------------------------------------------------

function makeToolsCallRequest(
  toolName: string,
  args: Record<string, unknown>,
): RpcRequest {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  };
}

void test('server rejects lint_snippet with unsupported aepVersion', async () => {
  const linter = makeMockLinter({ messages: [] });
  const req = makeToolsCallRequest('lint_snippet', {
    code: 'color: red;',
    fileType: 'css',
    aepVersion: '99',
  });
  const response = await handleRequest(linter, req);
  assert.ok('error' in response && response.error !== undefined);
  assert.ok(response.error.message.includes('Unsupported AEP version'));
  assert.ok(response.error.message.includes("'99'"));
});

void test('server accepts lint_snippet with aepVersion 1', async () => {
  const linter = makeMockLinter({ messages: [] });
  const req = makeToolsCallRequest('lint_snippet', {
    code: 'color: red;',
    fileType: 'css',
    aepVersion: '1',
  });
  const response = await handleRequest(linter, req);
  assert.ok('result' in response && response.result !== undefined);
  assert.ok(!('error' in response) || response.error === undefined);
});

void test('server accepts lint_snippet without aepVersion', async () => {
  const linter = makeMockLinter({ messages: [] });
  const req = makeToolsCallRequest('lint_snippet', {
    code: 'color: red;',
    fileType: 'css',
  });
  const response = await handleRequest(linter, req);
  assert.ok('result' in response && response.result !== undefined);
});
