import ts from 'typescript';
import type { PluginModule, RuleModule } from '../../src/core/types.ts';

const rule: RuleModule<unknown> = {
  name: 'plugin/test',
  meta: { description: 'test rule' },
  create(context) {
    // ensure getFlattenedTokens is callable for plugin rules
    context.getFlattenedTokens('color');
    return {
      onNode(node) {
        if (node.kind === ts.SyntaxKind.SourceFile) {
          context.report({ message: 'plugin works', line: 1, column: 1 });
        }
      },
    };
  },
};

const plugin: PluginModule = {
  rules: [rule],
};

export default plugin;
