import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSourceFile,
  forEachChild,
  isStringLiteral,
  ScriptKind,
  ScriptTarget,
  type Node,
  type StringLiteral,
} from 'typescript';
import { guards } from '../../src/utils/index.js';

const {
  ast: { isInNonStyleJsx },
} = guards;

function getStrings(code: string): StringLiteral[] {
  const sf = createSourceFile(
    'x.tsx',
    code,
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  );
  const nodes: StringLiteral[] = [];
  const walk = (node: Node) => {
    if (isStringLiteral(node)) nodes.push(node);
    forEachChild(node, walk);
  };
  walk(sf);
  return nodes;
}

void test('isInNonStyleJsx handles React.createElement props', () => {
  const [, title, color] = getStrings(
    "React.createElement('div', { title: 'foo', style: { color: 'bar' } })",
  );
  assert.equal(isInNonStyleJsx(title), true);
  assert.equal(isInNonStyleJsx(color), false);
});

void test('isInNonStyleJsx handles h() props', () => {
  const [, title, color] = getStrings(
    "h('div', { title: 'foo', style: { color: 'bar' } })",
  );
  assert.equal(isInNonStyleJsx(title), true);
  assert.equal(isInNonStyleJsx(color), false);
});
