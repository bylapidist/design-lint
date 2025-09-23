import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTsDeclarations } from '../../src/output/ts.js';
import type { DesignTokens } from '../../src/core/types.js';

const srgb = (components: [number, number, number]) => ({
  colorSpace: 'srgb',
  components,
});

void test('generateTsDeclarations emits typed object with themes', async () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      $version: '1.0.0',
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: srgb([1, 1, 1]) },
      },
    },
    dark: {
      $version: '1.0.0',
      ColorPalette: {
        PrimaryColor: { $type: 'color', $value: srgb([0, 0, 0]) },
      },
    },
  };

  const ts = await generateTsDeclarations(tokens, {
    nameTransform: 'kebab-case',
  });
  const expected = [
    'export const tokens = {',
    '  "default": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: "rgb(255, 255, 255)",',
    '  },',
    '  "dark": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: "rgb(0, 0, 0)",',
    '  },',
    '} as const;',
    'export type Tokens = typeof tokens;',
  ].join('\n');
  assert.equal(ts, expected);
});
