import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTokenPath,
  pointerToTokenPath,
} from '../../../src/utils/tokens/token-view.js';
import type { DtifFlattenedToken } from '../../../src/core/types.js';

void test('getTokenPath normalizes pointer segments with transforms', () => {
  const token: DtifFlattenedToken = {
    id: '#/ColorGroup/PrimaryColor',
    pointer: '#/ColorGroup/PrimaryColor',
    path: ['ColorGroup', 'PrimaryColor'],
    name: 'PrimaryColor',
    type: 'color',
    value: '#fff',
    metadata: { extensions: {} },
  };

  assert.equal(getTokenPath(token), 'ColorGroup.PrimaryColor');
  assert.equal(getTokenPath(token, 'kebab-case'), 'color-group.primary-color');
});

void test('getTokenPath falls back to segments and token names when pointer path is absent', () => {
  const withoutPointer: DtifFlattenedToken = {
    id: '#',
    pointer: '#',
    path: ['color', 'background'],
    name: 'background',
    type: 'color',
    value: '#fff',
    metadata: { extensions: {} },
  };

  assert.equal(getTokenPath(withoutPointer), 'color.background');

  const withoutSegments: DtifFlattenedToken = {
    id: '#',
    pointer: '#',
    path: [],
    name: 'AccentColor',
    type: 'color',
    value: '#000',
    metadata: { extensions: {} },
  };

  assert.equal(getTokenPath(withoutSegments, 'kebab-case'), 'accent-color');
});

void test('getTokenPath throws when no pointer path, segments, or name are available', () => {
  const token: DtifFlattenedToken = {
    id: '#',
    pointer: '#',
    path: [],
    name: '',
    type: 'color',
    value: '#000',
    metadata: { extensions: {} },
  };

  assert.throws(
    () => getTokenPath(token),
    /Unable to derive token path for pointer/,
  );
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

void test('pointerToTokenPath supports alternate pointer syntaxes', () => {
  assert.equal(pointerToTokenPath('palette/primary'), 'palette.primary');
  assert.equal(pointerToTokenPath('/palette/primary'), 'palette.primary');
  assert.equal(pointerToTokenPath('#/foo~0bar'), 'foo~bar');
  assert.equal(pointerToTokenPath('/'), undefined);
});
