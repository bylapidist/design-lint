import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from '../../src/core/linter.ts';
import type { Environment } from '../../src/core/environment.ts';
import type { RuleModule, LintMessage } from '../../src/core/types.ts';
import { parserRegistry } from '../../src/core/parser-registry.ts';

class TestLinter extends Linter {
  public buildRuleContexts(...args: Parameters<Linter['buildRuleContexts']>) {
    return super.buildRuleContexts(...args);
  }
  public runParser(...args: Parameters<Linter['runParser']>) {
    return super.runParser(...args);
  }
  public filterDisabledMessages(
    ...args: Parameters<Linter['filterDisabledMessages']>
  ) {
    return super.filterDisabledMessages(...args);
  }
}

const env: Environment = {
  documentSource: {
    scan() {
      return Promise.resolve({ documents: [], ignoreFiles: [] });
    },
  },
};

void test('buildRuleContexts records rule metadata and reports messages', () => {
  const linter = new TestLinter({ tokens: {}, rules: {} }, env);
  const rule: RuleModule = {
    name: 'test/rule',
    meta: { description: 'desc', category: 'cat' },
    create(context) {
      context.report({ message: 'msg', line: 1, column: 1 });
      return {};
    },
  };
  const { listeners, ruleDescriptions, ruleCategories, messages } =
    linter.buildRuleContexts(
      [{ rule, options: undefined, severity: 'warn' }],
      'file.ts',
    );
  assert.equal(listeners.length, 1);
  assert.deepEqual(ruleDescriptions, { 'test/rule': 'desc' });
  assert.deepEqual(ruleCategories, { 'test/rule': 'cat' });
  assert.deepEqual(messages, [
    {
      ruleId: 'test/rule',
      message: 'msg',
      severity: 'warn',
      line: 1,
      column: 1,
    },
  ]);
});

void test('runParser executes parser for provided type', async () => {
  const linter = new TestLinter({ tokens: {}, rules: {} }, env);
  const messages: LintMessage[] = [];
  const listeners: ReturnType<RuleModule['create']>[] = [];
  parserRegistry.custom = (text, sourceId, l, msgs) => {
    msgs.push({
      ruleId: 'a',
      message: 'ok',
      severity: 'error',
      line: 1,
      column: 1,
    });
  };
  try {
    await linter.runParser('a', 'file.custom', 'custom', listeners, messages);
    assert.equal(messages.length, 1);
  } finally {
    delete parserRegistry.custom;
  }
});

void test('filterDisabledMessages removes disabled lines', () => {
  const linter = new TestLinter({ tokens: {}, rules: {} }, env);
  const messages: LintMessage[] = [
    { ruleId: 'a', message: '', severity: 'error', line: 1, column: 1 },
    { ruleId: 'a', message: '', severity: 'error', line: 3, column: 1 },
    { ruleId: 'a', message: '', severity: 'error', line: 4, column: 1 },
  ];
  const text = 'a\n// design-lint-disable-next-line\nb\nc\n';
  const filtered = linter.filterDisabledMessages(text, messages);
  assert.deepEqual(
    filtered.map((m) => m.line),
    [1, 4],
  );
});
