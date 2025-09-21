import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenTracker } from '../../src/core/token-tracker.js';
import type { DesignTokens } from '../../src/core/types.js';
import type { TokenProvider } from '../../src/core/environment.js';

function makeProvider(tokens: DesignTokens): TokenProvider {
  return {
    load: () => Promise.resolve({ default: tokens }),
  };
}

void test('TokenTracker reports unused tokens', async () => {
  const tokens: DesignTokens = {
    color: { red: { $value: '#ff0000', $type: 'color' } },
    spacing: {
      four: {
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
        $type: 'dimension',
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
  assert.equal(reports[0].messages[0].message.includes('#/spacing/four'), true);
});

void test('hexColor classifier tracks custom property usage', async () => {
  const tokens: DesignTokens = {
    color: {
      used: { $value: '#111111', $type: 'color' },
      unused: { $value: '#222222', $type: 'color' },
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
  assert.equal(reports[0].messages[0].message.includes('#/color/unused'), true);
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
  assert.equal(reports[0].messages[0].message.includes('#/color/other'), true);
});

void test('numeric classifier matches number tokens', async () => {
  const tokens: DesignTokens = {
    spacing: {
      four: {
        $value: { dimensionType: 'length', value: 4, unit: 'px' },
        $type: 'dimension',
      },
      eight: {
        $value: { dimensionType: 'length', value: 8, unit: 'px' },
        $type: 'dimension',
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
  assert.equal(
    reports[0].messages[0].message.includes('#/spacing/eight'),
    true,
  );
});

void test('string classifier matches plain string tokens', async () => {
  const tokens: DesignTokens = {
    color: {
      used: { $value: '#ff0000', $type: 'color' },
      unused: { $value: '#0000ff', $type: 'color' },
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
  assert.equal(reports[0].messages[0].message.includes('#/color/unused'), true);
});

void test('TokenTracker resolves alias tokens when tracking usage', async () => {
  const tokens: DesignTokens = {
    color: {
      red: { $value: '#ff0000', $type: 'color' },
      primary: { $ref: '#/color/red', $type: 'color' },
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
        $deprecated: true,
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
  assert.equal(msg.metadata.pointer, '#/color/unused');
  assert.deepEqual(msg.metadata.value, '#123456');
  assert.equal(msg.metadata.type, 'color');
  assert.equal(msg.metadata.deprecated, true);
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});
