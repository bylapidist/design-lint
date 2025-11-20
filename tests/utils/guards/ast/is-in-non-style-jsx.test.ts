/**
 * Unit tests for {@link isInNonStyleJsx} AST guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getStrings } from '../../ast.js';
import { isInNonStyleJsx } from '../../../../src/utils/guards/ast/is-in-non-style-jsx.js';

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

void test('isInNonStyleJsx handles JSX attributes', () => {
  const [title, color] = getStrings(
    "<div title='foo' style={{ color: 'bar' }} />",
  );
  assert.equal(isInNonStyleJsx(title), true);
  assert.equal(isInNonStyleJsx(color), true);
});

void test('isInNonStyleJsx rejects non-JSX calls', () => {
  const [val] = getStrings("foo({ title: 'bar' })");
  assert.equal(isInNonStyleJsx(val), false);
});

void test('isInNonStyleJsx handles object properties in JSX attributes', () => {
  const [val] = getStrings("<div foo={{ bar: 'baz' }} />");
  assert.equal(isInNonStyleJsx(val), true);
});

void test('isInNonStyleJsx detects nested props in h() calls', () => {
  const [, val] = getStrings("h('div', { foo: { bar: 'baz' } })");
  assert.equal(isInNonStyleJsx(val), true);
});

void test('isInNonStyleJsx rejects style properties in non-JSX calls', () => {
  const [val] = getStrings("foo({ style: { color: 'red' } })");
  assert.equal(isInNonStyleJsx(val), false);
});

void test('isInNonStyleJsx rejects nested style properties', () => {
  const [, val] = getStrings("<div style={{ style: { color: 'red' } }} />");
  assert.equal(isInNonStyleJsx(val), false);
});
