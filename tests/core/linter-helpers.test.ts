import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter as initLinter } from '../../src/index.js';
import type { Environment } from '../../src/core/environment.js';
import type {
  RuleModule,
  LintMessage,
  DtifFlattenedToken,
} from '../../src/core/types.js';
import type { Linter } from '../../src/core/linter.js';
import { parserRegistry } from '../../src/core/parser-registry.js';
import { TokenRegistry } from '../../src/core/token-registry.js';
import { createDtifToken } from '../helpers/dtif.js';

const env: Environment = {
  documentSource: {
    scan() {
      return Promise.resolve({ documents: [], ignoreFiles: [] });
    },
  },
};

void test('buildRuleContexts records rule metadata and reports messages', () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const helper = linter as unknown as {
    buildRuleContexts: Linter['buildRuleContexts'];
  };
  const rule: RuleModule = {
    name: 'test/rule',
    meta: { description: 'desc', category: 'cat' },
    create(context) {
      context.report({ message: 'msg', line: 1, column: 1 });
      return {};
    },
  };
  const { listeners, ruleDescriptions, ruleCategories, messages } =
    helper.buildRuleContexts(
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

void test('buildRuleContexts exposes DTIF tokens on the rule context', () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const helper = linter as unknown as {
    buildRuleContexts: Linter['buildRuleContexts'];
    tokenRegistry: TokenRegistry;
  };
  const tokens = [
    createDtifToken('palette.primary', {
      type: 'color',
      value: '#fff',
    }),
  ];
  const darkTokens = [
    createDtifToken('palette.primary', {
      type: 'color',
      value: '#000',
    }),
  ];
  helper.tokenRegistry = new TokenRegistry({
    default: tokens,
    dark: darkTokens,
  });
  const capturedDtif: DtifFlattenedToken[][] = [];
  const capturedPaths: string[][] = [];
  const rule: RuleModule = {
    name: 'test/dtif',
    meta: { description: 'dtif rule' },
    create(context) {
      const dtif = context.getDtifTokens('color');
      capturedDtif.push(dtif);
      capturedPaths.push(dtif.map((token) => context.getTokenPath(token)));
      return {};
    },
  };

  helper.buildRuleContexts(
    [{ rule, options: undefined, severity: 'warn' }],
    'file.ts',
  );

  assert.equal(capturedDtif.length, 1);
  assert.equal(capturedDtif[0].length, 1);
  assert.equal(capturedDtif[0][0].pointer, '#/palette/primary');

  assert.equal(capturedPaths.length, 1);
  assert.deepEqual(capturedPaths[0], ['palette.primary']);
});

void test('runParser executes parser for provided type', async () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const parserHelper = linter as unknown as {
    runParser: Linter['runParser'];
  };
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
    await parserHelper.runParser(
      'a',
      'file.custom',
      'custom',
      listeners,
      messages,
    );
    assert.equal(messages.length, 1);
  } finally {
    delete parserRegistry.custom;
  }
});

void test('filterDisabledMessages removes disabled lines', () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const filterHelper = linter as unknown as {
    filterDisabledMessages: Linter['filterDisabledMessages'];
  };
  const messages: LintMessage[] = [
    { ruleId: 'a', message: '', severity: 'error', line: 1, column: 1 },
    { ruleId: 'a', message: '', severity: 'error', line: 3, column: 1 },
    { ruleId: 'a', message: '', severity: 'error', line: 4, column: 1 },
  ];
  const text = 'a\n// design-lint-disable-next-line\nb\nc\n';
  const filtered = filterHelper.filterDisabledMessages(text, messages);
  assert.deepEqual(
    filtered.map((m) => m.line),
    [1, 4],
  );
});
