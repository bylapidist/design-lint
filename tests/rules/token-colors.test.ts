import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/engine.ts';

test('design-token/colors reports disallowed hwb', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "hwb(0, 0%, 0%)";', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports disallowed lab', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "lab(0% 0 0)";', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports disallowed lch', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText('const c = "lch(0% 0 0)";', 'file.ts');
  assert.equal(res.messages.length, 1);
});

test('design-token/colors reports disallowed color()', async () => {
  const linter = new Linter({
    tokens: { colors: { primary: '#ffffff' } },
    rules: { 'design-token/colors': 'error' },
  });
  const res = await linter.lintText(
    'const c = "color(display-p3 1 0 0)";',
    'file.ts',
  );
  assert.equal(res.messages.length, 1);
});
