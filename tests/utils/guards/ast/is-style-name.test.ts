/**
 * Unit tests for {@link isStyleName} AST guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  type NodeArray,
  type PropertyAssignment,
} from 'typescript';
import { getExpression } from '../../ast.js';
import { guards } from '../../../../src/utils/index.js';

const {
  ast: { isStyleName },
} = guards;

void test('isStyleName detects style property names', () => {
  const expr = getExpression('({ style: 1, foo: 2 })');
  const obj = 'expression' in expr ? expr.expression : expr;
  const [styleProp, fooProp] = obj.properties as NodeArray<PropertyAssignment>;
  assert.equal(isStyleName(styleProp.name), true);
  assert.equal(isStyleName(fooProp.name), false);
});
