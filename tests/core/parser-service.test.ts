import test from 'node:test';
import assert from 'node:assert/strict';
import { ParserService } from '../../src/core/parser-service.js';
import type { RuleModule } from '../../src/core/types.js';

void test('parses css and triggers rule listeners', async () => {
  const rule: RuleModule = {
    name: 'test/rule',
    meta: { description: 'test rule' },
    create(context) {
      return {
        onCSSDeclaration(decl) {
          context.report({
            message: decl.prop,
            line: decl.line,
            column: decl.column,
          });
        },
      };
    },
  };
  const parser = new ParserService({});
  const enabled = [{ rule, options: undefined, severity: 'error' as const }];
  const { messages, ruleDescriptions } = await parser.parse(
    'a{color:red}',
    'a.css',
    enabled,
  );
  assert.equal(messages[0].message, 'color');
  assert.equal(ruleDescriptions['test/rule'], 'test rule');
});
