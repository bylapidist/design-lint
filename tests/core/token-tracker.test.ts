import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenTracker } from '../../src/core/token-tracker.js';
import type { DesignTokens, TokenDeprecation } from '../../src/core/types.js';
import type { TokenProvider } from '../../src/core/environment.js';

function makeProvider(tokens: DesignTokens): TokenProvider {
  return {
    load: () => Promise.resolve({ default: tokens }),
  };
}

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

void test('TokenTracker reports unused tokens', async () => {
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
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage('const c = "#ff0000";');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('4px'), true);
});

void test('hexColor classifier tracks custom property usage', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      used: { $type: 'string', $value: '#111111' },
      unused: { $type: 'string', $value: '#222222' },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage('color: #111111;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('#222222'), true);
});

void test('hexColor classifier is case-insensitive', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      brand: { $type: 'string', $value: '#ABCDEF' },
      other: { $type: 'string', $value: '#123456' },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage('color: #abcdef;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('#123456'), true);
});

void test('numeric classifier matches number tokens', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    spacing: {
      four: {
        $type: 'dimension',
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
      },
      eight: {
        $type: 'dimension',
        $value: { dimensionType: 'length', value: 8, unit: 'px' },
      },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage('margin: 4px');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('8px'), true);
});

void test('string classifier matches plain string tokens', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      used: { $type: 'string', $value: '#ff0000' },
      unused: { $type: 'string', $value: '#0000ff' },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage('color: #ff0000;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('#0000ff'), true);
});

void test('TokenTracker resolves alias tokens when tracking usage', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      red: { $type: 'string', $value: '#ff0000' },
      primary: { $type: 'string', $ref: '#/color/red' },
    },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage('color: #ff0000;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 0);
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
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'warn',
    },
  ]);
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  const msg = reports[0].messages[0];
  assertTokenMetadata(msg.metadata);
  assert.equal(msg.metadata.path, 'color.unused');
  assert.equal(msg.metadata.pointer, '#/color/unused');
  assert.equal(
    msg.metadata.deprecated?.supersededBy?.pointer,
    '#/color/replacement',
  );
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});
