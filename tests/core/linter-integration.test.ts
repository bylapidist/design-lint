import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import type { LintResult } from '../../src/core/types.ts';

test('Linter integrates registry, parser and trackers', async () => {
  const linter = new Linter({
    tokens: {},
    rules: { 'design-token/colors': 'error' },
  });
  type Internal = { lintText: (t: string, f: string) => Promise<LintResult> };
  const res = await (linter as unknown as Internal).lintText(
    'a{color:#fff;}',
    'file.css',
  );
  assert.equal(res.messages.length, 1);
});
