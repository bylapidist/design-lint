import { test } from 'node:test';
import assert from 'node:assert';
import { Linter } from '../../src/core/linter.js';
import type { Environment } from '../../src/core/environment.js';

void test('constructor accepts legacy environment', async () => {
  const env: Environment = {
    documentSource: {
      scan() {
        return Promise.resolve({ documents: [], ignoreFiles: [] });
      },
    },
  };
  const linter = new Linter({ tokens: {}, rules: {} }, env);
  const { results, ignoreFiles } = await linter.lintTargets(['foo']);
  assert.deepStrictEqual(results, []);
  assert.deepStrictEqual(ignoreFiles, []);
});
