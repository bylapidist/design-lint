import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.js';

void test('integrates parser and rules', async () => {
  const linter = new Linter({
    rules: { 'design-system/no-inline-styles': 'error' },
  });
  const res = await linter.lintText(
    '<Button style={{color:"red"}} />',
    'file.tsx',
  );
  assert.ok(
    res.messages.some((m) => m.ruleId === 'design-system/no-inline-styles'),
  );
});
