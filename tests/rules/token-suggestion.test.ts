import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

void test('suggests closest token name', async () => {
  const linter = new Linter({
    tokens: { spacing: ['--space-scale-100', '--space-scale-200'] },
    rules: { 'design-token/spacing': 'error' },
  });
  const res = await linter.lintText(
    'a{margin:var(--space-scale-10o);}',
    'a.css',
  );
  assert.equal(res.messages[0]?.suggest, '--space-scale-100');
});
