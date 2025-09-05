import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../src/core/linter.ts';

void test('getTokenCompletions returns token names', () => {
  const linter = new Linter({
    tokens: {
      spacing: ['--space-scale-100'],
      colors: { primary: 'var(--color-primary)', secondary: '#fff' },
    },
  });
  const comps = linter.getTokenCompletions();
  assert.deepEqual(comps.spacing, ['--space-scale-100']);
  assert.deepEqual(comps.colors, ['--color-primary']);
});
