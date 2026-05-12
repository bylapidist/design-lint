import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { createConfigTokenProvider } from './helpers/token-provider.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('getTokenCompletions returns token paths by theme', () => {
  const completionsConfig = {
    tokens: {
      $version: '1.0.0',
      color: {
        primary: { $type: 'color', $value: srgb([1, 0, 0]) },
      },
    },
  };
  const linter = initLinter(completionsConfig, {
    documentSource: new FileSource(),
    tokenProvider: createConfigTokenProvider(completionsConfig),
  });
  assert.deepEqual(linter.getTokenCompletions(), {});
});
