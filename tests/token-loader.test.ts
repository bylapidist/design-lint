import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTokens } from '../src/core/token-loader.ts';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/core/file-source.ts';

void test('normalizeTokens wraps values with var when enabled', () => {
  const tokens = { colors: { primary: '--color-primary' } };
  const normalized = normalizeTokens(tokens, true).merged;
  assert.equal(normalized.colors?.primary, 'var(--color-primary)');
});

void test('normalizeTokens merges tokens across themes', () => {
  const tokens = {
    base: { colors: { primary: '#000' } },
    light: { colors: { secondary: '#fff' } },
  };
  const normalized = normalizeTokens(tokens);
  assert.equal(normalized.themes.base.colors.primary, '#000');
  assert.equal(normalized.themes.light.colors.secondary, '#fff');
  assert.equal(normalized.merged.colors.primary, '#000');
  assert.equal(normalized.merged.colors.secondary, '#fff');
});

void test('Linter applies wrapTokensWithVar option', async () => {
  const linter = new Linter(
    {
      tokens: { fonts: { sans: '--font-sans' } },
      wrapTokensWithVar: true,
      rules: { 'design-token/font-family': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{font-family:var(--font-sans);}',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('Linter reports unknown CSS variable with wrapTokensWithVar', async () => {
  const linter = new Linter(
    {
      tokens: { fonts: { sans: '--font-sans' } },
      wrapTokensWithVar: true,
      rules: { 'design-token/font-family': 'error' },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    '.a{font-family:var(--other);}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});

void test('Rule theme filtering validates selected themes', async () => {
  const linter = new Linter(
    {
      tokens: {
        light: { colors: { primary: '#fff' } },
        dark: { colors: { primary: '#000' } },
      },
      rules: { 'design-token/colors': ['error', { themes: ['dark'] }] },
    },
    new FileSource(),
  );
  const ok = await linter.lintText('.a{color:#000}', 'file.css');
  assert.equal(ok.messages.length, 0);
  const bad = await linter.lintText('.a{color:#fff}', 'file.css');
  assert.equal(bad.messages.length, 1);
});

void test('Rules validate all themes by default', async () => {
  const linter = new Linter(
    {
      tokens: {
        light: { colors: { primary: '#fff' } },
        dark: { colors: { primary: '#000' } },
      },
      rules: { 'design-token/colors': 'error' },
    },
    new FileSource(),
  );
  const res1 = await linter.lintText('.a{color:#000}', 'file.css');
  assert.equal(res1.messages.length, 0);
  const res2 = await linter.lintText('.a{color:#fff}', 'file.css');
  assert.equal(res2.messages.length, 0);
});
