import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTokenStringValue,
  isTokenInGroup,
} from '../../../../src/utils/guards/domain/dtif-token.js';
import { createDtifToken } from '../../../helpers/dtif.js';

const baseToken = createDtifToken('spacing.md', {
  type: 'dimension',
});

void test('isTokenInGroup returns true when the first segment matches', () => {
  assert.equal(isTokenInGroup(baseToken, 'spacing'), true);
  assert.equal(isTokenInGroup(baseToken, 'color'), false);
});

void test('getTokenStringValue returns literals while skipping aliases', () => {
  const literal = createDtifToken('spacing.md', {
    type: 'dimension',
    value: '4px',
  });
  assert.equal(getTokenStringValue(literal), '4px');

  const alias = createDtifToken('spacing.md', {
    type: 'dimension',
    value: '{color.primary}',
  });
  assert.equal(getTokenStringValue(alias), undefined);
  assert.equal(
    getTokenStringValue(alias, { allowAliases: true }),
    '{color.primary}',
  );
});

void test('getTokenStringValue returns DTIF color hex values', () => {
  const token = createDtifToken('color.old', {
    type: 'color',
    value: {
      colorSpace: 'srgb',
      components: [0, 0, 0],
      hex: '#000000',
    },
  });
  assert.equal(getTokenStringValue(token), '#000000');
});

void test('getTokenStringValue formats DTIF colors without hex', () => {
  const token = createDtifToken('color.new', {
    type: 'color',
    value: {
      colorSpace: 'srgb',
      components: [1, 0, 0],
    },
  });
  assert.equal(getTokenStringValue(token), 'color(srgb 1 0 0)');
});

void test('getTokenStringValue reads DTIF color fallbacks', () => {
  const token = createDtifToken('color.fallback', {
    type: 'color',
    value: [
      { $ref: '#/color/new' },
      {
        colorSpace: 'srgb',
        components: [1, 1, 1],
        hex: '#ffffff',
      },
    ],
  });
  assert.equal(getTokenStringValue(token), '#ffffff');
});
