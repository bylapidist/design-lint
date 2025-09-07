import test from 'node:test';
import assert from 'node:assert/strict';
import { ParserService } from '../../src/core/parser-service.ts';
import type { RuleModule, DesignTokens } from '../../src/core/types.ts';

const tokensByTheme: Record<string, DesignTokens> = {};
const parser = new ParserService(tokensByTheme);

test('ParserService dispatches CSS declarations', async () => {
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
  const res = await parser.lintText('a{color:red;}', 'a.css', [
    { rule, options: undefined, severity: 'error' },
  ]);
  assert.equal(res.messages.length, 1);
  assert.equal(res.messages[0].message, 'bad color');
});
