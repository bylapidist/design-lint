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

test('applyFixes skips overlapping fix ranges', () => {
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
  assert.equal(applyFixes('abcdef', messages), 'Adef');
});

test('applyFixes is order-independent for overlapping ranges', () => {
  const messages: LintMessage[] = [
    {
      ruleId: 'b',
      message: '',
      severity: 'error',
      line: 0,
      column: 0,
      fix: { range: [1, 4], text: 'B' },
    },
    {
      ruleId: 'a',
      message: '',
      severity: 'error',
      line: 0,
      column: 0,
      fix: { range: [0, 3], text: 'A' },
    },
  ];
  assert.equal(applyFixes('abcdef', messages), 'Adef');
});
