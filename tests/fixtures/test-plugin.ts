import ts from 'typescript';
import type { PluginModule } from '../../src/core/types.ts';

const plugin: PluginModule = {
  rules: [
    {
      name: 'plugin/test',
      meta: { description: 'test rule' },
      create(context) {
        return {
          onNode(node) {
            if (node.kind === ts.SyntaxKind.SourceFile) {
              context.report({ message: 'plugin works', line: 1, column: 1 });
            }
          },
        };
      },
    },
  ],
};

export default plugin;
