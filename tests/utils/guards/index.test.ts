/**
 * Unit tests for the guards utility index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as guards from '../../../src/utils/guards/index.js';

void test('guards expose grouped namespaces', () => {
  assert.equal(typeof guards.ast.isJsxLike, 'function');
  assert.equal(typeof guards.data.isObject, 'function');
  assert.equal(typeof guards.domain.isDesignTokens, 'function');
  assert.equal(typeof guards.domain.isToken, 'function');
  assert.equal(typeof guards.domain.isTokenGroup, 'function');
});

void test('guard members are directly exported', () => {
  assert.equal(typeof guards.isJsxLike, 'function');
  assert.equal(typeof guards.isObject, 'function');
  assert.equal(typeof guards.isDesignTokens, 'function');
  assert.equal(typeof guards.isToken, 'function');
  assert.equal(typeof guards.isTokenGroup, 'function');
});

void test('guards execute without throwing', () => {
  guards.isJsxLike(ts.factory.createIdentifier('div'));
  guards.isObject(null);
  guards.isDesignTokens(null);
});
