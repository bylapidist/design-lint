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
    color: {
      red: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
    },
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
    color: {
      used: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0x11 / 255, 0x11 / 255, 0x11 / 255],
        },
      },
      unused: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0x22 / 255, 0x22 / 255, 0x22 / 255],
        },
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
  await tracker.trackUsage('color: #111111;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  const unusedMessages = reports[0].messages;
  assert.equal(
    unusedMessages.some((msg) => msg.metadata?.path === '/color/unused'),
    true,
  );
  assert.equal(
    unusedMessages.some((msg) => msg.message.includes('#222222')),
    true,
  );
});

void test('hexColor classifier is case-insensitive', async () => {
  const tokens: DesignTokens = {
    color: {
      brand: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0xab / 255, 0xcd / 255, 0xef / 255],
        },
      },
      other: {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [0x12 / 255, 0x34 / 255, 0x56 / 255],
        },
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
  await tracker.trackUsage('color: #abcdef;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  const unusedMessages = reports[0].messages;
  assert.equal(
    unusedMessages.some((msg) => msg.metadata?.path === '/color/other'),
    true,
  );
  assert.equal(
    unusedMessages.some((msg) => msg.message.includes('#123456')),
    true,
  );
});

void test('numeric classifier matches number tokens', async () => {
  const tokens: DesignTokens = {
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
    string: {
      used: { $type: 'string', $value: 'primary' },
      unused: { $type: 'string', $value: 'secondary' },
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
  await tracker.trackUsage("const c = 'primary';");
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('secondary'), true);
});

void test('TokenTracker resolves alias tokens when tracking usage', async () => {
  const tokens: DesignTokens = {
    color: {
      red: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
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
        $value: {
          colorSpace: 'srgb',
          components: [0x12 / 255, 0x34 / 255, 0x56 / 255],
        },
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
  assert.equal(msg.metadata.path, '/color/unused');
  assert.equal(msg.metadata.deprecated, true);
  assert.deepEqual(msg.metadata.extensions, { 'vendor.foo': true });
});
