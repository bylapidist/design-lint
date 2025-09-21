import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareTokenPath,
  sortTokensByPath,
} from '../../../src/utils/tokens/index.js';
import type { FlattenedToken } from '../../../src/core/types.js';

function token(path: string): FlattenedToken {
  return {
    path,
    value: path,
    metadata: { loc: { line: 1, column: 1 } },
  };
}

void test('sortTokensByPath orders tokens alphabetically by path', () => {
  const tokens = [token('/b/beta'), token('/a/alpha')];
  const sorted = sortTokensByPath(tokens);
  assert.deepEqual(
    sorted.map((t) => t.path),
    ['/a/alpha', '/b/beta'],
  );
  assert.equal(tokens[0].path, '/b/beta');
});

void test('compareTokenPath sorts by path', () => {
  const a = token('/a');
  const b = token('/b');
  assert.ok(compareTokenPath(a, b) < 0);
  assert.ok(compareTokenPath(b, a) > 0);
});
