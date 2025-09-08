import test from 'node:test';
import assert from 'node:assert/strict';
import { parserRegistry } from '../../packages/core/src/core/parser-registry.ts';
import type {
  RuleModule,
  RuleContext,
  LintMessage,
} from '../../packages/core/src/core/types.ts';

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
  { ext: '.css', filePath: 'a.css', text: 'a{color:red;}' },
  { ext: '.ts', filePath: 'a.ts', text: 'css`color:red;`' },
  {
    ext: '.vue',
    filePath: 'a.vue',
    text: '<template></template><style>a{color:red;}</style>',
  },
  {
    ext: '.svelte',
    filePath: 'a.svelte',
    text: '<div class="a"></div><style>.a{color:red;}</style>',
  },
];

for (const c of cases) {
  void test(`parser ${c.ext} dispatches CSS declarations`, async () => {
    const parser = parserRegistry[c.ext];
    assert.ok(parser, 'parser exists');
    const messages: LintMessage[] = [];
    const ctx: RuleContext = {
      filePath: c.filePath,
      tokens: {},
      options: undefined,
      report: (m) =>
        messages.push({ ...m, severity: 'error', ruleId: rule.name }),
    };
    const listener = rule.create(ctx);
    await parser(c.text, c.filePath, [listener], messages);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].message, 'bad color');
  });
}
