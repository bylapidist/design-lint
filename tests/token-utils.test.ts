import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTokens,
  matchToken,
  closestToken,
  extractVarName,
} from '../src/core/token-utils.ts';
import { Linter } from '../src/core/linter.ts';
import { FileSource } from '../src/adapters/node/file-source.ts';

void test('normalizeTokens wraps values with var when enabled', () => {
  const tokens = { colors: { primary: '--color-primary' } };
  const normalized = normalizeTokens(tokens, true).merged;
  assert.equal(normalized.colors?.primary, 'var(--color-primary)');
});

void test('normalizeTokens merges tokens across themes', () => {
  const tokens = {
    base: {
      colors: { primary: '#000' },
      variables: {
        primary: { id: '--color-primary', modes: { base: '#000' } },
      },
    },
    light: {
      colors: { secondary: '#fff' },
      variables: {
        secondary: {
          id: '--color-secondary',
          modes: { base: '#fff' },
          aliasOf: '--color-primary',
        },
      },
    },
  };
  const normalized = normalizeTokens(tokens);
  assert.equal(normalized.themes.base.colors.primary, '#000');
  assert.equal(normalized.themes.light.colors.secondary, '#fff');
  assert.equal(normalized.merged.colors.primary, '#000');
  assert.equal(normalized.merged.colors.secondary, '#fff');
  assert.equal(normalized.themes.base.variables.primary.id, '--color-primary');
  assert.equal(
    normalized.themes.light.variables.secondary.aliasOf,
    '--color-primary',
  );
  assert.equal(normalized.merged.variables.primary.id, '--color-primary');
  assert.equal(normalized.merged.variables.secondary.id, '--color-secondary');
  assert.equal(
    normalized.merged.variables.secondary.aliasOf,
    '--color-primary',
  );
  assert.equal(normalized.merged.variables.primary.modes?.base, '#000');
  assert.equal(normalized.merged.variables.secondary.modes?.base, '#fff');
});

void test('matchToken handles regexp and glob patterns and missing matches', () => {
  assert.equal(matchToken('--brand-primary', [/^--brand-/]), '--brand-primary');
  assert.equal(matchToken('--brand-primary', ['--brand-*']), '--brand-primary');
  assert.equal(matchToken('--foo', ['--bar']), null);
});

void test('matchToken is case-insensitive for string patterns', () => {
  assert.equal(matchToken('--BRAND-primary', ['--brand-*']), '--BRAND-primary');
});

void test('closestToken skips non-string patterns and suggests best match', () => {
  assert.equal(closestToken('--baz', ['--bar', /^--foo-/]), '--bar');
  assert.equal(closestToken('--baz', [/^--foo-/]), null);
});

void test('extractVarName parses var() and ignores invalid values', () => {
  assert.equal(extractVarName('var(--x)'), '--x');
  assert.equal(extractVarName('var(--x, 10px)'), '--x');
  assert.equal(extractVarName('var(  --x  )'), '--x');
  assert.equal(extractVarName('--x'), null);
  assert.equal(extractVarName('var(--foo.bar)'), null);
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
