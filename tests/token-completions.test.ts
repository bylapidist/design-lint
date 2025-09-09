import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/core/file-source.ts';

void test('getTokenCompletions returns token names', () => {
  const linter = new Linter(
    {
      tokens: {
        variables: {
          primary: { id: '--color-primary', value: '#fff' },
          accent: { id: '--color-accent', value: '#000' },
        },
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
  assert.deepEqual(comps.variables, ['--color-primary', '--color-accent']);
  assert.deepEqual(comps.spacing, ['--space-scale-100']);
  assert.deepEqual(comps.colors, [
    '--color-primary',
    '--color-accent',
    '--color-spaced',
  ]);
});
