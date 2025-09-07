import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenTracker } from '../../src/core/token-tracker.ts';
import type { DesignTokens } from '../../src/core/types.ts';

test('TokenTracker reports unused tokens', () => {
  const tokens: DesignTokens = {
    colors: { red: 'var(--red)' },
    spacing: ['4px'],
  };
  const tracker = new TokenTracker(tokens);
  tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  tracker.trackUsage('const c = "var(--red)";');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('4px'), true);
});

test('cssVar classifier tracks custom property usage', () => {
  const tokens: DesignTokens = {
    colors: { used: 'var(--used)', unused: 'var(--unused)' },
  };
  const tracker = new TokenTracker(tokens);
  tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  tracker.trackUsage('color: var(--used);');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('--unused'), true);
});

test('hexColor classifier is case-insensitive', () => {
  const tokens: DesignTokens = {
    colors: { brand: '#ABCDEF', other: '#123456' },
  };
  const tracker = new TokenTracker(tokens);
  tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  tracker.trackUsage('color: #abcdef;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('#123456'), true);
});

test('numeric classifier matches number tokens', () => {
  const tokens: DesignTokens = {
    spacing: ['4px', '8px'],
  };
  const tracker = new TokenTracker(tokens);
  tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  tracker.trackUsage('margin: 4px');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('8px'), true);
});

test('string classifier matches plain string tokens', () => {
  const tokens: DesignTokens = {
    colors: { used: 'red', unused: 'blue' },
  };
  const tracker = new TokenTracker(tokens);
  tracker.configure([
    {
      rule: { name: 'design-system/no-unused-tokens' },
      options: {},
      severity: 'error',
    },
  ]);
  tracker.trackUsage('color: red;');
  const reports = tracker.generateReports('config');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].messages[0].message.includes('blue'), true);
});
