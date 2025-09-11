import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSourceFile,
  isCallExpression,
  ScriptKind,
  ScriptTarget,
  type CallExpression,
  type ExpressionStatement,
} from 'typescript';
import { isReactCreateElementCall } from '../../src/utils/is-react-create-element-call.ts';

function getCall(code: string): CallExpression {
  const sf = createSourceFile(
    'x.tsx',
    code,
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  );
  const expr = (sf.statements[0] as ExpressionStatement).expression;
  if (!isCallExpression(expr)) throw new Error('not call');
  return expr;
}

void test('isReactCreateElementCall detects React.createElement', () => {
  const node = getCall("React.createElement('div')");
  assert.equal(isReactCreateElementCall(node), true);
});

void test('isReactCreateElementCall ignores other calls', () => {
  const node = getCall('foo()');
  assert.equal(isReactCreateElementCall(node), false);
});
