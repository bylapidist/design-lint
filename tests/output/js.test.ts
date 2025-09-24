import test from 'node:test';
import assert from 'node:assert/strict';
import { generateJsConstants } from '../../src/output/js.js';
import type { DtifFlattenedToken } from '../../src/core/types.js';
import { createDtifTheme, createDtifToken } from '../helpers/dtif.js';

void test('generateJsConstants emits constants for each theme', () => {
  const tokens = {
    default: createDtifTheme({
      'ColorPalette.PrimaryColor': { type: 'color', value: '#fff' },
    }),
    dark: createDtifTheme({
      'ColorPalette.PrimaryColor': { type: 'color', value: '#000' },
    }),
  } as const;

  const js = generateJsConstants(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const COLOR_PALETTE_PRIMARY_COLOR = "#fff";',
    'export const COLOR_PALETTE_PRIMARY_COLOR_DARK = "#000";',
  ].join('\n');
  assert.equal(js, expected);
});

void test('generateJsConstants accepts flattened DTIF tokens', () => {
  const tokens = {
    default: createDtifTokens('#fff'),
    dark: createDtifTokens('#000'),
  } satisfies Record<string, readonly DtifFlattenedToken[]>;

  const js = generateJsConstants(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const COLOR_PALETTE_PRIMARY_COLOR = "#fff";',
    'export const COLOR_PALETTE_PRIMARY_COLOR_DARK = "#000";',
  ].join('\n');
  assert.equal(js, expected);
});

function createDtifTokens(value: string): readonly DtifFlattenedToken[] {
  return [
    createDtifToken('ColorPalette.PrimaryColor', {
      type: 'color',
      value,
    }),
  ];
}
