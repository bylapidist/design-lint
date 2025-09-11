import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSourceFile,
  ScriptKind,
  ScriptTarget,
  type NodeArray,
  type ObjectLiteralExpression,
  type PropertyAssignment,
  type VariableStatement,
} from 'typescript';
import { isStyleName } from '../../src/utils/ast/index.js';

void test('isStyleName detects style property names', () => {
  const sf = createSourceFile(
    'x.ts',
    'const o = { style: 1, foo: 2 };',
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  );
  const decl = (sf.statements[0] as VariableStatement).declarationList
    .declarations[0];
  const obj = decl.initializer as ObjectLiteralExpression;
  const [styleProp, fooProp] = obj.properties as NodeArray<PropertyAssignment>;
  assert.equal(isStyleName(styleProp.name), true);
  assert.equal(isStyleName(fooProp.name), false);
});
