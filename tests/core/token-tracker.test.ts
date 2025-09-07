import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenTracker } from '../../src/core/token-tracker.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('tracks used tokens and reports unused ones', () => {
  const tracker = new TokenTracker({
    colors: ['red', 'blue'],
  } as unknown as DesignTokens);
  tracker.track('div { color: red; }');
  const results = tracker.getUnusedTokenResults(
    [
      {
        ruleId: 'design-system/no-unused-tokens',
        severity: 'warn',
        ignored: new Set(),
      },
    ],
    'config',
  );
  assert.ok(results[0].messages[0].message.includes('blue'));
  const comps = tracker.getCompletions();
  assert.ok(comps.colors.includes('red'));
});
