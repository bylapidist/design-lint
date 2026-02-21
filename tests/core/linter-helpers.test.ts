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
import { RUNTIME_ERROR_RULE_ID } from '../../src/core/cache-manager.js';

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

void test('buildRuleContexts captures create errors and continues', () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const helper = linter as unknown as {
    buildRuleContexts: Linter['buildRuleContexts'];
  };

  const crashingRule: RuleModule = {
    name: 'custom/crash-create',
    meta: { description: 'crashes in create' },
    create() {
      throw new Error('create exploded');
    },
  };

  const healthyRule: RuleModule = {
    name: 'custom/healthy-create',
    meta: { description: 'healthy create' },
    create(context) {
      context.report({
        message: 'create ok',
        line: 1,
        column: 1,
      });
      return {};
    },
  };

  const { listeners, messages } = helper.buildRuleContexts(
    [
      { rule: crashingRule, options: undefined, severity: 'error' },
      { rule: healthyRule, options: undefined, severity: 'warn' },
    ],
    'file.ts',
  );

  assert.equal(listeners.length, 1);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].ruleId, RUNTIME_ERROR_RULE_ID);
  assert.match(messages[0].message, /custom\/crash-create/);
  assert.equal(messages[1].ruleId, 'custom/healthy-create');
  assert.equal(messages[1].message, 'create ok');
});

void test('buildRuleContexts exposes DTIF tokens on the rule context', () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const helper = linter as unknown as {
    buildRuleContexts: Linter['buildRuleContexts'];
    tokenRegistry: TokenRegistry;
  };
  const tokens: DtifFlattenedToken[] = [
    {
      id: '#/palette/primary',
      pointer: '#/palette/primary',
      path: ['palette', 'primary'],
      name: 'primary',
      type: 'color',
      value: '#fff',
      raw: '#fff',
      metadata: { extensions: {} },
    },
  ];
  const darkTokens: DtifFlattenedToken[] = [
    {
      id: '#/palette/primary',
      pointer: '#/palette/primary',
      path: ['palette', 'primary'],
      name: 'primary',
      type: 'color',
      value: '#000',
      raw: '#000',
      metadata: { extensions: {} },
    },
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

void test('buildRunRuleContexts executes post-run hooks with token usage API', async () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const helper = linter as unknown as {
    buildRunRuleContexts: Linter['buildRunRuleContexts'];
    tokenTracker: {
      getUnusedTokens: (ignored?: readonly string[]) => Promise<
        {
          value: string;
          path: string;
          pointer: string;
          extensions: Record<string, unknown>;
        }[]
      >;
    };
  };

  helper.tokenTracker = {
    getUnusedTokens: (ignored = []) =>
      Promise.resolve(
        ignored.includes('used')
          ? []
          : [
              {
                value: 'unused',
                path: 'color.unused',
                pointer: '#/color/unused',
                extensions: {},
              },
            ],
      ),
  };

  const rule: RuleModule<{ ignore?: string[] }> = {
    name: 'custom/aggregate',
    meta: {
      description: 'aggregate',
      capabilities: { tokenUsage: true },
    },
    create: () => ({}),
    createRun(context) {
      return {
        onRunComplete: async () => {
          const unused = await context.tokenUsage.getUnusedTokens(
            context.options?.ignore,
          );
          for (const token of unused) {
            context.report({
              message: token.value,
              line: 1,
              column: 1,
            });
          }
        },
      };
    },
  };

  const run = helper.buildRunRuleContexts(
    [{ rule, options: {}, severity: 'warn' }],
    'config.json',
  );

  const messages = await run.collect();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, 'custom/aggregate');
  assert.equal(messages[0].message, 'unused');
  assert.equal(run.sourceId, 'config.json');
});

void test('buildRunRuleContexts captures onRunComplete errors and continues', async () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const helper = linter as unknown as {
    buildRunRuleContexts: Linter['buildRunRuleContexts'];
  };

  const crashingRule: RuleModule = {
    name: 'custom/crash',
    meta: { description: 'crashes' },
    create: () => ({}),
    createRun() {
      return {
        onRunComplete: () => {
          throw new Error('run exploded');
        },
      };
    },
  };

  const healthyRule: RuleModule = {
    name: 'custom/healthy',
    meta: { description: 'healthy' },
    create: () => ({}),
    createRun(context) {
      return {
        onRunComplete: () => {
          context.report({
            message: 'run ok',
            line: 1,
            column: 1,
          });
        },
      };
    },
  };

  const run = helper.buildRunRuleContexts(
    [
      { rule: crashingRule, options: undefined, severity: 'error' },
      { rule: healthyRule, options: undefined, severity: 'warn' },
    ],
    'config.json',
  );

  const messages = await run.collect();
  assert.equal(messages.length, 2);
  assert.equal(messages[0].ruleId, RUNTIME_ERROR_RULE_ID);
  assert.match(messages[0].message, /custom\/crash/);
  assert.equal(messages[1].ruleId, 'custom/healthy');
  assert.equal(messages[1].message, 'run ok');
});

void test('buildRunRuleContexts captures createRun errors and continues', async () => {
  const linter = initLinter({ tokens: {}, rules: {} }, env);
  const helper = linter as unknown as {
    buildRunRuleContexts: Linter['buildRunRuleContexts'];
  };

  const crashingRule: RuleModule = {
    name: 'custom/crash-create-run',
    meta: { description: 'crashes in createRun' },
    create: () => ({}),
    createRun() {
      throw new Error('createRun exploded');
    },
  };

  const healthyRule: RuleModule = {
    name: 'custom/healthy-create-run',
    meta: { description: 'healthy createRun' },
    create: () => ({}),
    createRun(context) {
      return {
        onRunComplete: () => {
          context.report({
            message: 'createRun ok',
            line: 1,
            column: 1,
          });
        },
      };
    },
  };

  const run = helper.buildRunRuleContexts(
    [
      { rule: crashingRule, options: undefined, severity: 'error' },
      { rule: healthyRule, options: undefined, severity: 'warn' },
    ],
    'config.json',
  );

  const messages = await run.collect();
  assert.equal(messages.length, 2);
  assert.equal(messages[0].ruleId, RUNTIME_ERROR_RULE_ID);
  assert.match(messages[0].message, /custom\/crash-create-run/);
  assert.equal(messages[1].ruleId, 'custom/healthy-create-run');
  assert.equal(messages[1].message, 'createRun ok');
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
