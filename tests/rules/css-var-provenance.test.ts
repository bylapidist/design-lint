import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';
import { NodeTokenProvider } from '../../src/adapters/node/token-provider.js';
import { createDtifTheme } from '../helpers/dtif.js';

const tokens = createDtifTheme({
  'color.brand.primary': { type: 'color', value: '#3B82F6' },
  'spacing.4': { type: 'dimension', value: '16px' },
});

function createLinter() {
  return initLinter(
    { tokens, rules: { 'design-token/css-var-provenance': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(tokens),
    },
  );
}

void test('design-token/css-var-provenance reports unknown CSS variable', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { color: var(--ghost-variable); }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('--ghost-variable'));
});

void test('design-token/css-var-provenance accepts a known token variable', async () => {
  const linter = createLinter();
  // Pointer for 'color.brand.primary' becomes '--color-brand-primary'
  const res = await linter.lintText(
    'a { color: var(--color-brand-primary); }',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/css-var-provenance ignores non-var declarations', async () => {
  const linter = createLinter();
  const res = await linter.lintText('a { color: red; margin: 0; }', 'file.css');
  assert.equal(res.messages.length, 0);
});

void test('design-token/css-var-provenance ignores non-CSS-variable function calls', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { background: url(image.png); }',
    'file.css',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-token/css-var-provenance reports multiple unknown variables', async () => {
  const linter = createLinter();
  const res = await linter.lintText(
    'a { color: var(--unknown-a); margin: var(--unknown-b); }',
    'file.css',
  );
  assert.equal(res.messages.length, 2);
});

void test('design-token/css-var-provenance works when no tokens are configured', async () => {
  const linter = initLinter(
    { rules: { 'design-token/css-var-provenance': 'error' } },
    {
      documentSource: new FileSource(),
      tokenProvider: new NodeTokenProvider(),
    },
  );
  const res = await linter.lintText(
    'a { color: var(--any-variable); }',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});
