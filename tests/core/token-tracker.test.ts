import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenTracker } from '../../src/core/token-tracker.ts';
import type { DesignTokens } from '../../src/core/types.ts';
import type { TokenProvider } from '../../src/core/environment.ts';

function makeProvider(tokens: DesignTokens): TokenProvider {
  return {
    load: () => Promise.resolve({ default: tokens }),
  };
}

void test('TokenTracker reports unused tokens', async () => {
  const tokens: DesignTokens = {
    color: { red: { $value: 'var(--red)', $type: 'color' } },
    spacing: { four: { $value: { value: 4, unit: 'px' }, $type: 'dimension' } },
  };
  const tracker = new TokenTracker(makeProvider(tokens));
  await tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  await tracker.trackUsage('const c = "var(--red)";');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('4px'), true);
});

void test('cssVar classifier tracks custom property usage', async () => {
  const tokens: DesignTokens = {
    color: {
      used: { $value: 'var(--used)', $type: 'color' },
      unused: { $value: 'var(--unused)', $type: 'color' },
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
  await tracker.trackUsage('color: var(--used);');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('--unused'), true);
});

void test('hexColor classifier is case-insensitive', async () => {
  const tokens: DesignTokens = {
    color: {
      brand: { $value: '#ABCDEF', $type: 'color' },
      other: { $value: '#123456', $type: 'color' },
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
    spacing: {
      four: { $value: { value: 4, unit: 'px' }, $type: 'dimension' },
      eight: { $value: { value: 8, unit: 'px' }, $type: 'dimension' },
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
    color: {
      used: { $value: 'red', $type: 'color' },
      unused: { $value: 'blue', $type: 'color' },
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
  await tracker.trackUsage('color: red;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('blue'), true);
});

void test('TokenTracker resolves alias tokens when tracking usage', async () => {
  const tokens: DesignTokens = {
    color: {
      red: { $value: '#ff0000', $type: 'color' },
      primary: { $value: '{color.red}', $type: 'color' },
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
    color: {
      unused: {
        $value: '#123456',
        $type: 'color',
        $deprecated: 'deprecated',
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
  assert(msg.metadata);
  assert.equal(msg.metadata.path, 'color.unused');
  assert.equal(msg.metadata.deprecated, 'deprecated');
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});
