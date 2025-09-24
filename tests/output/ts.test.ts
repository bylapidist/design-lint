import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTsDeclarations } from '../../src/output/ts.js';
import type { DtifFlattenedToken } from '../../src/core/types.js';
import { createDtifTheme, createDtifToken } from '../helpers/dtif.js';

void test('generateTsDeclarations emits typed object with themes', () => {
  const tokens = {
    default: createDtifTheme({
      'ColorPalette.PrimaryColor': { type: 'color', value: '#fff' },
    }),
    dark: createDtifTheme({
      'ColorPalette.PrimaryColor': { type: 'color', value: '#000' },
    }),
  } as const;

  const ts = generateTsDeclarations(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const tokens = {',
    '  "default": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: "#fff",',
    '  },',
    '  "dark": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: "#000",',
    '  },',
    '} as const;',
    'export type Tokens = typeof tokens;',
  ].join('\n');
  assert.equal(ts, expected);
});

void test('generateTsDeclarations accepts flattened DTIF tokens', () => {
  const tokens = {
    default: createDtifTokens('#fff'),
    dark: createDtifTokens('#000'),
  } satisfies Record<string, readonly DtifFlattenedToken[]>;

  const ts = generateTsDeclarations(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const tokens = {',
    '  "default": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: "#fff",',
    '  },',
    '  "dark": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: "#000",',
    '  },',
    '} as const;',
    'export type Tokens = typeof tokens;',
  ].join('\n');
  assert.equal(ts, expected);
});

function createDtifTokens(value: string): readonly DtifFlattenedToken[] {
  return [
    createDtifToken('ColorPalette.PrimaryColor', {
      type: 'color',
      value,
    }),
  ];
}
