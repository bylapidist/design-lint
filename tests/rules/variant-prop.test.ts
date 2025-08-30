import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';

test('design-system/variant-prop flags invalid variant', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { components: { Button: ['primary', 'secondary'] } },
      ],
    },
  });
  const res = await linter.lintText(
    'const a = <Button variant="danger" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('danger'));
});

test('design-system/variant-prop allows valid variant', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { components: { Button: ['primary', 'secondary'] } },
      ],
    },
  });
  const res = await linter.lintText(
    'const a = <Button variant="primary" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

test('design-system/variant-prop flags string literals in expressions', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { components: { Button: ['primary', 'secondary'] } },
      ],
    },
  });
  const res = await linter.lintText(
    "const a = <Button variant={'danger'} />;",
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('danger'));
});

test('design-system/variant-prop ignores dynamic expressions', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { components: { Button: ['primary', 'secondary'] } },
      ],
    },
  });
  const res = await linter.lintText(
    'const a = <Button variant={foo} />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 0);
});

test('design-system/variant-prop supports custom prop names', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { prop: 'tone', components: { Alert: ['info', 'error'] } },
      ],
    },
  });
  const res = await linter.lintText(
    'const a = <Alert tone="warn" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
  assert.ok(res.messages[0].message.includes('warn'));
});

test('design-system/variant-prop flags invalid variant in Vue components', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { components: { Button: ['primary', 'secondary'] } },
      ],
    },
  });
  const res = await linter.lintText(
    '<template><Button variant="danger" /></template>',
    'file.vue',
  );
  assert.equal(res.messages.length, 1);
});

test('design-system/variant-prop flags invalid variant in Svelte components', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { components: { Button: ['primary', 'secondary'] } },
      ],
    },
  });
  const res = await linter.lintText(
    '<Button variant="danger" />',
    'file.svelte',
  );
  assert.equal(res.messages.length, 1);
});

test('design-system/variant-prop flags invalid variant on custom elements', async () => {
  const linter = new Linter({
    rules: {
      'design-system/variant-prop': [
        'error',
        { components: { 'my-button': ['primary', 'secondary'] } },
      ],
    },
  });
  const res = await linter.lintText(
    'const a = <my-button variant="danger" />;',
    'file.tsx',
  );
  assert.equal(res.messages.length, 1);
});
