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
