/**
 * Unit tests for the cubic bezier validator.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCubicBezier } from '../../src/core/token-validators/cubicBezier.js';

void test('validateCubicBezier accepts four finite numbers', () => {
  assert.doesNotThrow(() => {
    validateCubicBezier([0.25, 0.5, 0.75, 1.5], 'ease');
  });
});

void test('validateCubicBezier rejects non-array values', () => {
  assert.throws(() => {
    validateCubicBezier('ease', 'ease');
  }, /Token ease/);
});

void test('validateCubicBezier rejects tuples with invalid length', () => {
  assert.throws(() => {
    validateCubicBezier([0, 0.5, 1], 'ease');
  }, /Token ease/);
});

void test('validateCubicBezier requires numeric control points', () => {
  assert.throws(() => {
    validateCubicBezier([0, Number.NaN, 1, 1], 'ease');
  }, /Token ease/);
});

void test('validateCubicBezier enforces unit interval for x control points', () => {
  assert.throws(() => {
    validateCubicBezier([-0.1, 0.5, 0.75, 1], 'ease');
  }, /Token ease/);
  assert.throws(() => {
    validateCubicBezier([0.1, 0.5, 1.1, 1], 'ease');
  }, /Token ease/);
});
