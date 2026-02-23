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

const nonTrackingRule: RuleModule = {
  name: 'test/non-tracking',
  meta: {
    description: 'non tracking',
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
  await tracker.trackUsage({
    text: "const c = '{color.red}';",
    references: [
      {
        kind: 'token-path',
        identity: 'color.red',
        line: 1,
        column: 1,
        context: 'ts:string',
      },
    ],
  });
  const unused = await tracker.getUnusedTokens();
  assert.equal(unused.length, 1);
  assert.equal(unused[0].path, 'spacing.four');
});

void test('TokenTracker tracks usage from css var identity references', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      unused: { $type: 'string', $value: 'var(--color-unused)' },
      used: { $type: 'string', $value: 'var(--color-used)' },
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
      replacement: {
        $type: 'string',
        $value: '#000000',
      },
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
  const unused = (await tracker.getUnusedTokens()).find(
    (entry) => entry.value === '#123456',
  );
  assert(unused);
  assertTokenMetadata(unused);
  assert.equal(unused.path, 'color.unused');
  assert.equal(unused.pointer, '#/color/unused');
  assert.equal(unused.deprecated?.supersededBy?.pointer, '#/color/replacement');
  assert.deepEqual(unused.extensions, { 'vendor.foo': true });
});

void test('TokenTracker exposes tracking consumer status from rule capabilities', async () => {
  const tracker = new TokenTracker(
    makeProvider({
      $version: '1.0.0',
      color: { blue: { $type: 'string', $value: '#0000ff' } },
    }),
  );
  await tracker.configure([{ rule: nonTrackingRule, severity: 'warn' }]);
  assert.equal(tracker.hasTrackingConsumers(), false);
});

void test('TokenTracker beginRun clears previously tracked usage', async () => {
  const tracker = new TokenTracker(
    makeProvider({
      $version: '1.0.0',
      color: { used: { $type: 'string', $value: '#ff0000' } },
    }),
  );
  await tracker.configure([{ rule: trackingRule, severity: 'warn' }]);
  await tracker.trackUsage({
    text: '{color.used}',
    references: [
      {
        kind: 'token-path',
        identity: 'color.used',
        line: 1,
        column: 1,
        context: 'ts:string',
      },
    ],
  });
  assert.deepEqual(await tracker.getUnusedTokens(), []);

  tracker.beginRun();
  const unused = await tracker.getUnusedTokens();
  assert.equal(unused.length, 1);
  assert.equal(unused[0]?.value, '#ff0000');
});

void test('TokenTracker supports ignored values when collecting unused tokens', async () => {
  const tracker = new TokenTracker(
    makeProvider({
      $version: '1.0.0',
      color: { unused: { $type: 'string', $value: '#abcdef' } },
    }),
  );
  await tracker.configure([{ rule: trackingRule, severity: 'warn' }]);
  const unused = await tracker.getUnusedTokens(['#abcdef']);
  assert.deepEqual(unused, []);
});

void test('TokenTracker resolves identity usage from explicit references only', async () => {
  const tracker = new TokenTracker(
    makeProvider({
      $version: '1.0.0',
      copy: { label: { $type: 'string', $value: 'copy.label' } },
      z: { modal: { $type: 'number', $value: 10 } },
    }),
  );
  await tracker.configure([{ rule: trackingRule, severity: 'warn' }]);
  await tracker.trackUsage({
    text: 'const a = "{ copy.label }"; const zIndex = 10;',
    references: [
      {
        kind: 'token-path',
        identity: 'copy.label',
        line: 1,
        column: 1,
        context: 'ts:string',
      },
      {
        kind: 'token-path',
        identity: 'z.modal',
        line: 1,
        column: 1,
        context: 'ts:string',
      },
    ],
  });
  assert.deepEqual(await tracker.getUnusedTokens(), []);
});

void test('TokenTracker includes wildcard token values and ignores non-token themes', async () => {
  const tracker = new TokenTracker({
    load: () =>
      Promise.resolve({
        $meta: { $version: '1.0.0' },
        default: {
          $version: '1.0.0',
          color: { dynamic: { $type: 'string', $value: 'palette.*' } },
        },
      }),
  });
  await tracker.configure([{ rule: trackingRule, severity: 'warn' }]);
  const unused = await tracker.getUnusedTokens();
  assert.equal(unused.length, 1);
  assert.equal(unused[0]?.path, 'color.dynamic');
});
