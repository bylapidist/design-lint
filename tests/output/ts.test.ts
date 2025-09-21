import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTsDeclarations } from '../../src/output/ts.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('generateTsDeclarations emits typed object with themes', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      ColorPalette: {
        PrimaryColor: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [1, 1, 1] },
        },
      },
    },
    dark: {
      ColorPalette: {
        PrimaryColor: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0, 0, 0] },
        },
      },
    },
  };

  const ts = generateTsDeclarations(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const tokens = {',
    '  "default": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: {"colorSpace":"srgb","components":[1,1,1]},',
    '  },',
    '  "dark": {',
    '    COLOR_PALETTE_PRIMARY_COLOR: {"colorSpace":"srgb","components":[0,0,0]},',
    '  },',
    '} as const;',
    'export type Tokens = typeof tokens;',
  ].join('\n');
  assert.equal(ts, expected);
});
