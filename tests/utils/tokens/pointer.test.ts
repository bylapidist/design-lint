import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodePointerSegment,
  encodePointerSegment,
  isPointerFragment,
  pathToPointer,
  pointerToPath,
} from '../../../src/utils/tokens/index.js';

void test('pathToPointer encodes special characters', () => {
  assert.equal(pathToPointer('color.primary'), '#/color/primary');
  assert.equal(pathToPointer('icon/home'), '#/icon~1home');
  assert.equal(pathToPointer('shape.tilde~name'), '#/shape/tilde~0name');
  assert.equal(
    pathToPointer('palette.brand primary'),
    '#/palette/brand%20primary',
  );
});

void test('pointerToPath decodes fragment identifiers', () => {
  assert.equal(pointerToPath('#/color/primary'), 'color.primary');
  assert.equal(pointerToPath('#/icon~1home'), 'icon/home');
  assert.equal(pointerToPath('#/shape/tilde~0name'), 'shape.tilde~name');
  assert.equal(
    pointerToPath('#/palette/brand%20primary'),
    'palette.brand primary',
  );
});

void test('pointerToPath ignores external document pointers', () => {
  assert.equal(pointerToPath('design-tokens.json#/color/primary'), undefined);
});

void test('pointerToPath rejects invalid pointer fragments', () => {
  assert.equal(pointerToPath('#/invalid~2segment'), undefined);
  assert.equal(pointerToPath('not-a-pointer'), undefined);
});

void test('encodePointerSegment mirrors decodePointerSegment', () => {
  const original = 'icons/set with space~special/name';
  const encoded = encodePointerSegment(original);
  assert.equal(decodePointerSegment(encoded), original);
  assert.equal(encoded, 'icons~1set%20with%20space~0special~1name');
});

void test('pointerToPath handles numeric segments', () => {
  assert.equal(pointerToPath('#/palette/0'), 'palette.0');
  assert.equal(pathToPointer('palette.0'), '#/palette/0');
});

void test('isPointerFragment validates JSON Pointer fragments', () => {
  assert.equal(isPointerFragment('#/color/primary'), true);
  assert.equal(isPointerFragment('#/palette/brand%20primary'), true);
  assert.equal(isPointerFragment('#/invalid~2segment'), false);
  assert.equal(isPointerFragment('not-a-pointer'), false);
});
