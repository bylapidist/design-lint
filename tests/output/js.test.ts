import test from 'node:test';
import assert from 'node:assert/strict';
import { generateJsConstants } from '../../src/output/js.js';
import type { DesignTokens, DtifFlattenedToken } from '../../src/core/types.js';

void test('generateJsConstants emits constants for each theme', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: '#fff' },
      },
    },
    dark: {
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: '#000' },
      },
    },
  };

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
  const tokens: DtifFlattenedToken[] = [
    {
      pointer: '#/ColorPalette/PrimaryColor',
      segments: ['ColorPalette', 'PrimaryColor'],
      name: 'ColorPalette.PrimaryColor',
      type: 'color',
      value,
      metadata: {},
    },
  ];
  return tokens;
}
