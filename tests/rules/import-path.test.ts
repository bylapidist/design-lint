import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../packages/core/src/core/linter.ts';
import { FileSource } from '../../packages/core/src/core/file-source.ts';

void test('design-system/import-path flags components from wrong package', async () => {
  const linter = new Linter(
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
  const linter = new Linter(
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
  const linter = new Linter(
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
  const linter = new Linter(
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
  const linter = new Linter(
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
