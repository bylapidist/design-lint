import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../packages/core/src/core/linter.ts';
import { FileSource } from '../packages/core/src/core/file-source.ts';

void test('getTokenCompletions returns token names', () => {
  const linter = new Linter(
    {
      tokens: {
        spacing: ['--space-scale-100'],
        colors: {
          primary: 'var(--color-primary)',
          secondary: '#fff',
          accent: 'var(--color-accent, #000)',
          spaced: 'var(  --color-spaced  )',
        },
      },
    },
    new FileSource(),
  );
  const comps = linter.getTokenCompletions();
  assert.deepEqual(comps.spacing, ['--space-scale-100']);
  assert.deepEqual(comps.colors, [
    '--color-primary',
    '--color-accent',
    '--color-spaced',
  ]);
});
