/**
 * Tests for DsrTokenProvider — the bridge between design-lint and the DSR kernel.
 *
 * Uses a mock NodeEnvironment factory instead of a live kernel process.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DsrTokenProvider } from '../src/adapters/node/dsr-token-provider.js';
import type { DsrEnvironmentFactory } from '../src/adapters/node/dsr-token-provider.js';
import type { NodeEnvironment } from '@lapidist/dsr/environments/node';

// ---------------------------------------------------------------------------
// Mock NodeEnvironment
// ---------------------------------------------------------------------------

interface MockDSQLTokenQuery {
  forProperty: (prop: string) => Promise<MockToken[]>;
}

interface MockToken {
  id: string;
  pointer: string;
  name: string;
  path: string[];
  type?: string;
  value?: unknown;
  raw?: unknown;
}

function makeEnv(tokens: MockToken[]): NodeEnvironment {
  const query: MockDSQLTokenQuery = {
    forProperty: () => Promise.resolve(tokens),
  };

  return {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    dsql: {
      tokens: () => query,
    },
    onEvent: () => () => {
      /* no-op */
    },
  } as unknown as NodeEnvironment;
}

function makeFactory(tokens: MockToken[] = []): DsrEnvironmentFactory {
  const env = makeEnv(tokens);
  return () => Promise.resolve(env);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void test('DsrTokenProvider.load returns a record keyed by "default"', async () => {
  const provider = new DsrTokenProvider(makeFactory());
  const result = await provider.load();

  assert.ok('default' in result, 'should have a "default" key');
});

void test('DsrTokenProvider.load maps kernel tokens to the design-lint shape', async () => {
  const kernelToken: MockToken = {
    id: '#/color/primary',
    pointer: '#/color/primary',
    name: 'color.primary',
    path: ['color', 'primary'],
    type: 'color',
    value: '#3B82F6',
  };

  const provider = new DsrTokenProvider(makeFactory([kernelToken]));
  const result = await provider.load();

  const tokens = result.default;
  assert.ok(Array.isArray(tokens), '"default" should be an array of tokens');
  assert.equal(tokens.length, 1);

  const [mapped] = tokens as [{ pointer: string; name: string; type?: string }];
  assert.equal(mapped.pointer, '#/color/primary');
  assert.equal(mapped.name, 'color.primary');
  assert.equal(mapped.type, 'color');
});

void test('DsrTokenProvider.load returns an empty array when kernel has no tokens', async () => {
  const provider = new DsrTokenProvider(makeFactory([]));
  const result = await provider.load();
  assert.ok(Array.isArray(result.default));
  assert.equal(result.default.length, 0);
});

void test('DsrTokenProvider.load preserves all token fields including metadata defaults', async () => {
  const kernelToken: MockToken = {
    id: '#/spacing/4',
    pointer: '#/spacing/4',
    name: 'spacing.4',
    path: ['spacing', '4'],
    type: 'dimension',
    value: '16px',
    raw: '16px',
  };

  const provider = new DsrTokenProvider(makeFactory([kernelToken]));
  const result = await provider.load();

  const [mapped] = result.default as [
    { metadata: { extensions: Record<string, unknown> } },
  ];
  // metadata is populated with safe defaults when kernel tokens don't carry it
  assert.ok(
    typeof mapped.metadata === 'object',
    'should have a metadata object',
  );
  assert.ok(
    typeof mapped.metadata.extensions === 'object',
    'metadata.extensions should be an object',
  );
});

void test('DsrTokenProvider.dispose disconnects the environment', async () => {
  let disconnected = false;
  const env: NodeEnvironment = {
    connect: () => Promise.resolve(),
    disconnect: () => {
      disconnected = true;
      return Promise.resolve();
    },
    dsql: {
      tokens: () => ({ forProperty: () => Promise.resolve([]) }),
    },
    onEvent: () => () => {
      /* no-op */
    },
  } as unknown as NodeEnvironment;

  const factory: DsrEnvironmentFactory = () => Promise.resolve(env);
  const provider = new DsrTokenProvider(factory);

  await provider.load();
  await provider.dispose();

  assert.equal(disconnected, true);
});

void test('DsrTokenProvider.dispose is a no-op before load is called', async () => {
  const provider = new DsrTokenProvider(makeFactory());
  await provider.dispose(); // should not throw
});

void test('DsrTokenProvider.dispose is safe to call twice', async () => {
  const provider = new DsrTokenProvider(makeFactory());
  await provider.load();
  await provider.dispose();
  await provider.dispose(); // second call should be a no-op
});

void test('DsrTokenProvider.load handles multiple tokens of different types', async () => {
  const tokens: MockToken[] = [
    {
      id: '#/color/primary',
      pointer: '#/color/primary',
      name: 'color.primary',
      path: ['color', 'primary'],
      type: 'color',
      value: '#3B82F6',
    },
    {
      id: '#/spacing/4',
      pointer: '#/spacing/4',
      name: 'spacing.4',
      path: ['spacing', '4'],
      type: 'dimension',
      value: '16px',
    },
    {
      id: '#/font/size/base',
      pointer: '#/font/size/base',
      name: 'font.size.base',
      path: ['font', 'size', 'base'],
      type: 'fontsize',
      value: '16px',
    },
  ];

  const provider = new DsrTokenProvider(makeFactory(tokens));
  const result = await provider.load();
  assert.equal(result.default.length, 3);
});
