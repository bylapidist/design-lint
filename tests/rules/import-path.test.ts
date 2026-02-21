import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import { FileSource } from '../../src/adapters/node/file-source.js';

void test('design-system/import-path flags components from wrong package', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/import-path': [
          'error',
          { packages: ['@acme/design-system'], components: ['Button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    "import { Button } from 'other';",
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/import-path allows configured package', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/import-path': [
          'error',
          { packages: ['@acme/design-system'], components: ['Button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    "import { Button } from '@acme/design-system';",
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

void test('design-system/import-path handles default imports', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/import-path': [
          'error',
          { packages: ['@acme/design-system'], components: ['Button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText("import Button from 'other';", 'file.ts');
  assert.equal(res.messages.length, 1);
});

void test('design-system/import-path enforces package in Vue components', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/import-path': [
          'error',
          { packages: ['@acme/design-system'], components: ['Button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    "<script setup>import { Button } from 'other';</script>",
    'file.vue',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/import-path enforces package in Svelte components', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/import-path': [
          'error',
          { packages: ['@acme/design-system'], components: ['Button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    "<script>import { Button } from 'other';</script>",
    'file.svelte',
  );
  assert.equal(res.messages.length, 1);
});

void test('design-system/import-path flags aliased named imports by imported symbol', async () => {
  const linter = initLinter(
    {
      rules: {
        'design-system/import-path': [
          'error',
          { packages: ['@acme/design-system'], components: ['Button'] },
        ],
      },
    },
    new FileSource(),
  );
  const res = await linter.lintText(
    "import { Button as LegacyButton } from 'other';",
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});
