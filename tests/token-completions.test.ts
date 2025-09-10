import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../src/core/linter.js';
import { FileSource } from '../src/adapters/node/file-source.js';

void test('getTokenCompletions returns token paths by theme', async () => {
  const linter = new Linter(
    {
      tokens: {
        light: {
          color: {
            primary: { $type: 'color', $value: '#f00' },
          },
        },
        dark: {
          color: {
            primary: { $type: 'color', $value: '#0f0' },
          },
        },
      },
    },
    { documentSource: new FileSource() },
  );
  await Promise.resolve();
  assert.deepEqual(linter.getTokenCompletions(), {
    light: ['color.primary'],
    dark: ['color.primary'],
  });
});
