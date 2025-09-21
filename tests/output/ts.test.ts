import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTsDeclarations } from '../../src/output/ts.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('generateTsDeclarations emits typed object with themes', () => {
  const tokens: Record<string, DesignTokens> = {
    default: {
      ColorPalette: {
        PrimaryColor: { $type: 'string', $value: '#fff' },
      },
    },
    dark: {
      ColorPalette: {
        PrimaryColor: { $type: 'string', $value: '#000' },
      },
    },
  };

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
