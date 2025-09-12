/**
 * Unit tests for {@link isStyleName} AST guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  type NodeArray,
  type ObjectLiteralExpression,
  type PropertyAssignment,
} from 'typescript';
import { getExpression } from '../../ast.js';
import { guards } from '../../../../src/utils/index.js';

const {
  ast: { isStyleName },
} = guards;

void test('isStyleName detects style property names', () => {
  const obj = getExpression(
    '({ style: 1, foo: 2 })',
  ) as ObjectLiteralExpression;
  const [styleProp, fooProp] = obj.properties as NodeArray<PropertyAssignment>;
  assert.equal(isStyleName(styleProp.name), true);
  assert.equal(isStyleName(fooProp.name), false);
});
