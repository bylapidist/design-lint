import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTokens } from '../src/core/token-loader.ts';
import { Linter } from '../src/core/linter.ts';

test('normalizeTokens wraps values with var when enabled', () => {
  const tokens = { colors: { primary: '--color-primary' } };
  const normalized = normalizeTokens(tokens, true);
  assert.equal(normalized.colors?.primary, 'var(--color-primary)');
});

test('Linter applies wrapTokensWithVar option', async () => {
  const linter = new Linter({
    tokens: { fonts: { sans: '--font-sans' } },
    wrapTokensWithVar: true,
    rules: { 'design-token/font-family': 'error' },
  });
  const res = await linter.lintText(
    '.a{font-family:var(--font-sans);}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

test('Linter reports unknown CSS variable with wrapTokensWithVar', async () => {
  const linter = new Linter({
    tokens: { fonts: { sans: '--font-sans' } },
    wrapTokensWithVar: true,
    rules: { 'design-token/font-family': 'error' },
  });
  const res = await linter.lintText(
    '.a{font-family:var(--other);}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});
