import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFixes } from '../../src';
import type { LintMessage } from '../../src/core/types';

test('applyFixes handles adjacent fix ranges', () => {
  const messages: LintMessage[] = [
    {
      ruleId: 'a',
      message: '',
      severity: 'error',
      line: 0,
      column: 0,
      fix: { range: [0, 3], text: 'abc' },
    },
    {
      ruleId: 'b',
      message: '',
      severity: 'error',
      line: 0,
      column: 0,
      fix: { range: [3, 6], text: 'def' },
    },
  ];
  assert.equal(applyFixes('123456', messages), 'abcdef');
});

test('applyFixes handles overlapping fix ranges', () => {
  const messages: LintMessage[] = [
    {
      ruleId: 'a',
      message: '',
      severity: 'error',
      line: 0,
      column: 0,
      fix: { range: [0, 3], text: 'A' },
    },
    {
      ruleId: 'b',
      message: '',
      severity: 'error',
      line: 0,
      column: 0,
      fix: { range: [1, 4], text: 'B' },
    },
  ];
  assert.equal(applyFixes('abcdef', messages), 'Af');
});
