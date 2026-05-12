import { test } from 'node:test';
import assert from 'node:assert';
import { Linter } from '../../src/core/linter.js';
import type { Environment } from '../../src/core/environment.js';

void test('constructor throws when tokenProvider is absent', () => {
  const env: Environment = {
    documentSource: {
      scan() {
        return Promise.resolve({ documents: [], ignoreFiles: [] });
      },
    },
  };
  assert.throws(
    () => new Linter({ tokens: {}, rules: {} }, env),
    /v8: Environment\.tokenProvider is required/,
  );
});
