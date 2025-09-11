import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSourceFile,
  isExpressionStatement,
  ScriptKind,
  ScriptTarget,
  type Expression,
} from 'typescript';
import { isJsxLike } from '../../src/utils/ast/index.js';

function getExpression(code: string): Expression {
  const sf = createSourceFile(
    'x.tsx',
    code,
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  );
  const stmt = sf.statements[0];
  if (!isExpressionStatement(stmt)) throw new Error('not expression');
  return stmt.expression;
}

void test('isJsxLike detects JSX element', () => {
  const node = getExpression('<div></div>');
  assert.equal(isJsxLike(node), true);
});

void test('isJsxLike detects self-closing element', () => {
  const node = getExpression('<div />');
  assert.equal(isJsxLike(node), true);
});

void test('isJsxLike detects fragment', () => {
  const node = getExpression('<></>');
  assert.equal(isJsxLike(node), true);
});

void test('isJsxLike ignores non-JSX nodes', () => {
  const node = getExpression('42');
  assert.equal(isJsxLike(node), false);
});
