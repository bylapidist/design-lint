import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTokenStringValue,
  isTokenInGroup,
} from '../../../../src/utils/guards/domain/dtif-token.js';
import type { DtifFlattenedToken } from '../../../../src/core/types.js';

const baseToken: DtifFlattenedToken = {
  pointer: '#/spacing/md',
  segments: ['spacing', 'md'],
  name: 'md',
  metadata: {},
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
