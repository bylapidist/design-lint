import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenTracker } from '../../src/core/token-tracker.js';
import type {
  DesignTokens,
  TokenDeprecation,
  RuleModule,
} from '../../src/core/types.js';
import type { TokenProvider } from '../../src/core/environment.js';

function makeProvider(tokens: DesignTokens): TokenProvider {
  return {
    load: () => Promise.resolve({ default: tokens }),
  };
}

const trackingRule: RuleModule = {
  name: 'test/tracking',
  meta: {
    description: 'tracking',
    capabilities: {
      tokenUsage: true,
    },
  },
  create: () => ({}),
};

interface TokenReportMetadata {
  path: string;
  pointer: string;
  deprecated?: TokenDeprecation;
  extensions: Record<string, unknown>;
}

function assertTokenMetadata(
  value: unknown,
): asserts value is TokenReportMetadata {
  assert.ok(isRecord(value), 'Expected metadata to be an object');
  assert.strictEqual(typeof value.path, 'string');
  assert.strictEqual(typeof value.pointer, 'string');
  assert.ok(isRecord(value.extensions));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

void test('TokenTracker reports unused tokens when unresolved references are provided', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: { red: { $type: 'string', $value: '#ff0000' } },
    spacing: {
      four: {
        $type: 'dimension',
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
      },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    {
      rule: trackingRule,
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage({ text: 'const c = "#ff0000";' });
  const unused = await tracker.getUnusedTokens();
  assert.equal(unused.length, 1);
  assert.equal(unused[0].value.includes('4px'), true);
});

void test('TokenTracker tracks usage from css var identity references', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      used: { $type: 'string', $value: 'var(--color-used)' },
      unused: { $type: 'string', $value: 'var(--color-unused)' },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    { rule: trackingRule, options: {}, severity: 'error' },
  ]);
  await tracker.trackUsage({
    text: 'color: var(--color-used);',
    references: [
      {
        kind: 'css-var',
        identity: '--color-used',
        line: 1,
        column: 1,
        context: 'css:value',
      },
    ],
  });
  const unused = await tracker.getUnusedTokens();
  assert.equal(unused.length, 1);
  assert.equal(unused[0].value.includes('--color-unused'), true);
});

void test('TokenTracker does not fall back to raw text matching when explicit references are empty', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      primary: { $type: 'string', $value: 'color.primary' },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    { rule: trackingRule, options: {}, severity: 'warn' },
  ]);

  await tracker.trackUsage({
    text: [
      'https://cdn.example.com/color.primary/icon.svg',
      'object.color.primary',
      'v1.2.3',
      '@scope/color.primary',
    ].join('\n'),
    references: [],
  });

  const unused = await tracker.getUnusedTokens();
  assert.equal(unused.length, 1);
  assert.equal(unused[0]?.path, 'color.primary');
});

void test('TokenTracker includes token metadata in reports', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      unused: {
        $type: 'string',
        $value: '#123456',
        $deprecated: { $replacement: '#/color/replacement' },
        $extensions: { 'vendor.foo': true },
      },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    { rule: trackingRule, options: {}, severity: 'warn' },
  ]);
  const [unused] = await tracker.getUnusedTokens();
  assert(unused);
  assertTokenMetadata(unused);
  assert.equal(unused.path, 'color.unused');
  assert.equal(unused.pointer, '#/color/unused');
  assert.equal(unused.deprecated?.supersededBy?.pointer, '#/color/replacement');
  assert.deepEqual(unused.extensions, { 'vendor.foo': true });
});
