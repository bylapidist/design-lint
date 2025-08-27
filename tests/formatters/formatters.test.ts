import { stylish } from '../../src/formatters/stylish';
import { jsonFormatter } from '../../src/formatters/json';
import { sarifFormatter } from '../../src/formatters/sarif';
import type { LintResult } from '../../src/core/types';

const sample: LintResult[] = [
  {
    filePath: 'file.ts',
    messages: [
      { ruleId: 'rule', message: 'msg', severity: 'error', line: 1, column: 1 },
    ],
  },
];

test('stylish', () => {
  expect(stylish(sample, false)).toMatchSnapshot();
});

test('json', () => {
  expect(jsonFormatter(sample)).toMatchSnapshot();
});

test('sarif', () => {
  expect(sarifFormatter(sample)).toMatchSnapshot();
});
