import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTokenPath,
  pointerToTokenPath,
} from '../../../src/utils/tokens/token-view.js';
import { createDtifToken } from '../../helpers/dtif.js';

void test('getTokenPath normalizes pointer segments with transforms', () => {
  const token = createDtifToken('ColorGroup.PrimaryColor', {
    type: 'color',
    value: '#fff',
  });

  assert.equal(getTokenPath(token), 'ColorGroup.PrimaryColor');
  assert.equal(getTokenPath(token, 'kebab-case'), 'color-group.primary-color');
});

void test('getTokenPath falls back to segments and token names when pointer path is absent', () => {
  const withoutPointer = createDtifToken('color.background', {
    type: 'color',
    value: '#fff',
  });
  withoutPointer.pointer = '#';

  assert.equal(getTokenPath(withoutPointer), 'color.background');

  const withoutSegments = createDtifToken('AccentColor', {
    type: 'color',
    value: '#000',
  });
  withoutSegments.pointer = '#';
  withoutSegments.path = [];

  assert.equal(getTokenPath(withoutSegments, 'kebab-case'), 'accent-color');
});

void test('pointerToTokenPath converts JSON pointers to normalized paths', () => {
  assert.equal(
    pointerToTokenPath('#/Color%20Group/Primary~1Color'),
    'Color%20Group.Primary/Color',
  );
  assert.equal(
    pointerToTokenPath('#/ColorGroup/PrimaryColor', 'kebab-case'),
    'color-group.primary-color',
  );
});

void test('pointerToTokenPath returns undefined for root pointers', () => {
  assert.equal(pointerToTokenPath('#'), undefined);
  assert.equal(pointerToTokenPath(undefined), undefined);
});
