import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine';

test('design-token/spacing enforces multiples', async () => {
  const linter = new Linter({
    tokens: { spacing: { sm: 4, md: 8 } },
    rules: { 'design-token/spacing': ['error', { base: 4 }] },
  });
  const res = await linter.lintText('const s = 5;', 'file.ts');
  assert.equal(res.messages.length, 1);
});
