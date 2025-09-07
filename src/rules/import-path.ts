import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

interface ImportPathOptions {
  packages?: string[];
  components?: string[];
}

export const importPathRule: RuleModule<ImportPathOptions> = {
  name: 'design-system/import-path',
  meta: {
    description:
      'ensure design system components are imported from configured packages',
  },
  create(context) {
    const opts: ImportPathOptions = context.options ?? {};
    const packages = new Set(opts.packages ?? []);
    const components = new Set(opts.components ?? []);
    return {
      onNode(node) {
        if (!ts.isImportDeclaration(node)) return;
        if (!node.importClause) return;
        if (!ts.isStringLiteral(node.moduleSpecifier)) return;
        const moduleText = node.moduleSpecifier.text;
        if (packages.has(moduleText)) return;
        const reportSpecifier = (nameNode: ts.Node, name: string) => {
          const pos = nameNode
            .getSourceFile()
            .getLineAndCharacterOfPosition(nameNode.getStart());
          context.report({
            message: `Design system component "${name}" must be imported from ${
              opts.packages?.join(', ') || 'configured packages'
            }`,
            line: pos.line + 1,
            column: pos.character + 1,
          });
        };
        const clause = node.importClause;
        if (clause.name && components.has(clause.name.getText())) {
          reportSpecifier(clause.name, clause.name.getText());
        }
        const bindings = clause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const elem of bindings.elements) {
            const name = elem.name.getText();
            if (components.has(name)) {
              reportSpecifier(elem.name, name);
            }
          }
        }
      },
    };
  },
};
