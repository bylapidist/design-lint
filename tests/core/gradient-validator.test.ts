import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGradient } from '../../src/core/token-validators/gradient.js';

const COLOR = {
  colorSpace: 'srgb',
  components: [0, 0, 0],
  alpha: 1,
  hex: '#000000',
} as const;

void test('validateGradient clamps stop positions', () => {
  const gradient = [
    { color: { ...COLOR }, position: -0.5 },
    { color: { ...COLOR }, position: 1.2 },
  ];
  assert.doesNotThrow(() => {
    validateGradient(gradient, 'gradient');
  });
  assert.equal(gradient[0].position, 0);
  assert.equal(gradient[1].position, 1);
});

void test('validateGradient rejects non-array values', () => {
  assert.throws(() => {
    validateGradient({}, 'gradient');
  }, /invalid gradient value/);
});

void test('validateGradient requires at least two stops', () => {
  assert.throws(() => {
    validateGradient([{ color: { ...COLOR }, position: 0.5 }], 'gradient');
  }, /invalid gradient value/);
});

void test('validateGradient enforces stop structure', () => {
  assert.throws(() => {
    validateGradient(
      [
        { color: { ...COLOR }, position: 0.5 },
        { color: { ...COLOR }, position: 0.75, unexpected: true },
      ] as unknown,
      'gradient',
    );
  }, /invalid gradient value/);
});

void test('validateGradient rejects non-record stops', () => {
  assert.throws(() => {
    validateGradient(
      [{ color: { ...COLOR }, position: 0.25 }, null] as unknown,
      'gradient',
    );
  }, /invalid gradient value/);
});

void test('validateGradient rejects non-finite stop positions', () => {
  assert.throws(() => {
    validateGradient(
      [
        { color: { ...COLOR }, position: Number.NaN },
        { color: { ...COLOR }, position: 0.5 },
      ],
      'gradient',
    );
  }, /invalid gradient value/);
});
