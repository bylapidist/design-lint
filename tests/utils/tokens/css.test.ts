import test from 'node:test';
import assert from 'node:assert/strict';
import { extractVarName } from '../../../src/utils/tokens/index.js';

void test('extractVarName parses var() and ignores invalid values', () => {
  assert.equal(extractVarName('var(--x)'), '--x');
  assert.equal(extractVarName('var(--x, 10px)'), '--x');
  assert.equal(extractVarName('var(  --x  )'), '--x');
  assert.equal(extractVarName('--x'), null);
  assert.equal(extractVarName('var(--foo.bar)'), null);
});
