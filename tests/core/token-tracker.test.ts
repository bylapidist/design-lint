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

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('TokenTracker reports unused tokens', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: { red: { $value: srgb([1, 0, 0]), $type: 'color' } },
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
  await tracker.trackUsage('const c = "rgb(255, 0, 0)";');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('4px'), true);
});

void test('hexColor classifier tracks custom property usage', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      used: { $value: srgb([17 / 255, 17 / 255, 17 / 255]), $type: 'color' },
      unused: { $value: srgb([34 / 255, 34 / 255, 34 / 255]), $type: 'color' },
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
  await tracker.trackUsage('color: rgb(17, 17, 17);');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(
    reports[0].messages[0].message.includes('rgb(34, 34, 34)'),
    true,
  );
});

void test('hexColor classifier is case-insensitive', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      brand: {
        $value: srgb([0xab / 0xff, 0xcd / 0xff, 0xef / 0xff]),
        $type: 'color',
      },
      other: {
        $value: srgb([0x12 / 0xff, 0x34 / 0xff, 0x56 / 0xff]),
        $type: 'color',
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
  await tracker.trackUsage('color: rgb(171, 205, 239);');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(
    reports[0].messages[0].message.includes('rgb(18, 52, 86)'),
    true,
  );
});

void test('numeric classifier matches number tokens', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
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
  assert.equal(reports[0].messages[0].message.includes('8px'), true);
});

void test('string classifier matches plain string tokens', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    typography: {
      used: { $value: 'Inter', $type: 'fontFamily' },
      unused: { $value: 'Monaco', $type: 'fontFamily' },
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
  await tracker.trackUsage('font-family: Inter;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('Monaco'), true);
});

void test('TokenTracker resolves alias tokens when tracking usage', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      red: { $value: srgb([1, 0, 0]), $type: 'color' },
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
  await tracker.trackUsage('color: rgb(255, 0, 0);');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 0);
});

void test('TokenTracker includes token metadata in reports', async () => {
  const tokens: DesignTokens = {
    $version: '1.0.0',
    color: {
      unused: {
        $value: srgb([0x12 / 0xff, 0x34 / 0xff, 0x56 / 0xff]),
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
  assert.equal(msg.metadata.deprecated, true);
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});
