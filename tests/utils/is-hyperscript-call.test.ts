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
import { isHyperscriptCall } from '../../src/utils/is-hyperscript-call.js';

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

void test('isHyperscriptCall detects h() calls', () => {
  const node = getCall("h('div')");
  assert.equal(isHyperscriptCall(node), true);
});

void test('isHyperscriptCall ignores other calls', () => {
  const node = getCall('foo()');
  assert.equal(isHyperscriptCall(node), false);
});
