import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenTracker } from '../../src/core/token-tracker.ts';
import type { DesignTokens } from '../../src/core/types.ts';
import type { TokenProvider } from '../../src/core/environment.ts';

function makeProvider(tokens: DesignTokens): TokenProvider {
  return {
    load: () =>
      Promise.resolve({ themes: { default: tokens }, merged: tokens }),
  };
}

void test('TokenTracker reports unused tokens', async () => {
  const tokens: DesignTokens = {
    colors: { red: 'var(--red)' },
    spacing: ['4px'],
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
    colors: { used: 'var(--used)', unused: 'var(--unused)' },
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
    colors: { brand: '#ABCDEF', other: '#123456' },
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
    spacing: ['4px', '8px'],
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
    colors: { used: 'red', unused: 'blue' },
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
