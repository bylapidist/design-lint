import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTokenStringValue,
  isTokenInGroup,
} from '../../../../src/utils/guards/domain/dtif-token.js';
import type { DtifFlattenedToken } from '../../../../src/core/types.js';

const baseToken: DtifFlattenedToken = {
  id: '#/spacing/md',
  pointer: '#/spacing/md',
  path: ['spacing', 'md'],
  name: 'md',
  metadata: { extensions: {} },
};

void test('isTokenInGroup returns true when the first segment matches', () => {
  assert.equal(isTokenInGroup(baseToken, 'spacing'), true);
  assert.equal(isTokenInGroup(baseToken, 'color'), false);
});

void test('getTokenStringValue returns literals while skipping aliases', () => {
  const literal: DtifFlattenedToken = {
    ...baseToken,
    value: '4px',
  };
  assert.equal(getTokenStringValue(literal), '4px');

  const alias: DtifFlattenedToken = {
    ...baseToken,
    value: '{color.primary}',
  };
  assert.equal(getTokenStringValue(alias), undefined);
  assert.equal(
    getTokenStringValue(alias, { allowAliases: true }),
    '{color.primary}',
  );
});

void test('getTokenStringValue returns DTIF color hex values', () => {
  const token: DtifFlattenedToken = {
    ...baseToken,
    pointer: '#/color/old',
    id: '#/color/old',
    path: ['color', 'old'],
    name: 'old',
    type: 'color',
    value: {
      colorSpace: 'srgb',
      components: [0, 0, 0],
      hex: '#000000',
    },
  };
  assert.equal(getTokenStringValue(token), '#000000');
});

void test('getTokenStringValue formats DTIF colors without hex', () => {
  const token: DtifFlattenedToken = {
    ...baseToken,
    pointer: '#/color/new',
    id: '#/color/new',
    path: ['color', 'new'],
    name: 'new',
    type: 'color',
    value: {
      colorSpace: 'srgb',
      components: [1, 0, 0],
    },
  };
  assert.equal(getTokenStringValue(token), 'color(srgb 1 0 0)');
});

void test('getTokenStringValue reads DTIF color fallbacks', () => {
  const token: DtifFlattenedToken = {
    ...baseToken,
    pointer: '#/color/fallback',
    id: '#/color/fallback',
    path: ['color', 'fallback'],
    name: 'fallback',
    type: 'color',
    value: [
      { $ref: '#/color/new' },
      {
        colorSpace: 'srgb',
        components: [1, 1, 1],
        hex: '#ffffff',
      },
    ],
  };
  assert.equal(getTokenStringValue(token), '#ffffff');
});

void test('getTokenStringValue reads values from token resolution', () => {
  const token: DtifFlattenedToken = {
    ...baseToken,
    pointer: '#/color/resolution',
    id: '#/color/resolution',
    path: ['color', 'resolution'],
    name: 'resolution',
    type: 'color',
    value: undefined,
    resolution: {
      id: '#/color/resolution',
      references: [],
      resolutionPath: [],
      appliedAliases: [],
      value: { colorSpace: 'srgb', components: [0.1, 0.2, 0.3], alpha: 0.5 },
    },
  };
  assert.equal(getTokenStringValue(token), 'color(srgb 0.1 0.2 0.3 / 0.5)');
});

void test('getTokenStringValue accepts none components and aliases when allowed', () => {
  const token: DtifFlattenedToken = {
    ...baseToken,
    pointer: '#/color/mixed',
    id: '#/color/mixed',
    path: ['color', 'mixed'],
    name: 'mixed',
    type: 'color',
    value: { colorSpace: 'srgb', components: ['none', 0, 1] },
    resolution: {
      id: '#/color/mixed',
      references: [],
      resolutionPath: [],
      appliedAliases: [],
      value: '{color.brand}',
    },
  };
  assert.equal(
    getTokenStringValue(token, { allowAliases: true }),
    '{color.brand}',
  );
  assert.equal(getTokenStringValue(token), 'color(srgb none 0 1)');
});

void test('getTokenStringValue returns undefined for invalid color objects', () => {
  const token: DtifFlattenedToken = {
    ...baseToken,
    pointer: '#/color/invalid',
    id: '#/color/invalid',
    path: ['color', 'invalid'],
    name: 'invalid',
    type: 'color',
    value: { colorSpace: 'srgb', components: [Number.NaN, 0, 0] },
  };
  assert.equal(getTokenStringValue(token), undefined);
});
