import test from 'node:test';
import assert from 'node:assert/strict';
import { generateJsConstants } from '../../src/output/js.js';
import type { DesignTokens } from '../../src/core/types.js';

void test('generateJsConstants emits constants for each theme', () => {
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

  const js = generateJsConstants(tokens, { nameTransform: 'kebab-case' });
  const expected = [
    'export const COLOR_PALETTE_PRIMARY_COLOR = "#fff";',
    'export const COLOR_PALETTE_PRIMARY_COLOR_DARK = "#000";',
  ].join('\n');
  assert.equal(js, expected);
});
