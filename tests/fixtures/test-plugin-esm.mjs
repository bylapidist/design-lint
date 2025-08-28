import ts from 'typescript';

export const plugin = {
  rules: [
    {
      name: 'plugin/esm',
      meta: { description: 'esm rule' },
      create(context) {
        return {
          onNode(node) {
            if (node.kind === ts.SyntaxKind.SourceFile) {
              context.report({ message: 'esm works', line: 1, column: 1 });
            }
          },
        };
      },
    },
  ],
};

export default plugin;
