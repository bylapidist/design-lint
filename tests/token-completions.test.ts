import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('getTokenCompletions returns token paths by theme', async () => {
  const linter = initLinter(
    {
      tokens: {
        light: {
          $version: '1.0.0',
          color: {
            primary: { $type: 'color', $value: srgb([1, 0, 0]) },
          },
        },
        dark: {
          $version: '1.0.0',
          color: {
            primary: { $type: 'color', $value: srgb([0, 1, 0]) },
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
