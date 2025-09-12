/**
 * Unit tests for {@link resolveFormatter} helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveFormatter,
  type Formatter,
} from '../../../src/formatters/get-formatter/index.js';

void test('resolveFormatter returns module itself when function', () => {
  const fn: Formatter = () => '';
  assert.equal(resolveFormatter(fn), fn);
});

void test('resolveFormatter returns default export', () => {
  const mod = { default: () => '' };
  const fn = resolveFormatter(mod);
  assert(fn);
  assert.equal(fn, mod.default);
});

void test('resolveFormatter returns named formatter export', () => {
  const mod = { formatter: () => '' };
  const fn = resolveFormatter(mod);
  assert(fn);
  assert.equal(fn, mod.formatter);
});

void test('resolveFormatter returns undefined for invalid module', () => {
  assert.equal(resolveFormatter({}), undefined);
});
