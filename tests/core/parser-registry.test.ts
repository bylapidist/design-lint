import test from 'node:test';
import assert from 'node:assert/strict';
import { parserRegistry } from '../../src/core/parser-registry.ts';
import { createFileDocument } from '../../src/adapters/node/file-document.ts';
import type {
  RuleModule,
  RuleContext,
  LintMessage,
} from '../../src/core/types.ts';

const rule: RuleModule = {
  name: 'test',
  meta: { description: 'test rule' },
  create(ctx) {
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'color') {
          ctx.report({
            message: 'bad color',
            line: decl.line,
            column: decl.column,
          });
        }
      },
    };
  },
};

const cases = [
  { sourceId: 'a.css', text: 'a{color:red;}' },
  { sourceId: 'a.ts', text: 'css`color:red;`' },
  {
    sourceId: 'a.vue',
    text: '<template></template><style>a{color:red;}</style>',
  },
  {
    sourceId: 'a.svelte',
    text: '<div class="a"></div><style>.a{color:red;}</style>',
  },
];

for (const c of cases) {
  void test(`parser ${c.sourceId} dispatches CSS declarations`, async () => {
    const doc = createFileDocument(c.sourceId);
    const parser = parserRegistry[doc.type];
    assert.ok(parser, 'parser exists');
    const messages: LintMessage[] = [];
    const ctx: RuleContext = {
      sourceId: c.sourceId,
      tokens: {},
      options: undefined,
      report: (m) =>
        messages.push({ ...m, severity: 'error', ruleId: rule.name }),
    };
    const listener = rule.create(ctx);
    await parser(c.text, c.sourceId, [listener], messages);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].message, 'bad color');
  });
}
