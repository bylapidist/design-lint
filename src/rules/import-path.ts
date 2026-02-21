import ts from 'typescript';
import { z } from 'zod';
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
    category: 'component',
    schema: z
      .object({
        packages: z.array(z.string()).optional(),
        components: z.array(z.string()).optional(),
      })
      .optional(),
  },
  create(context) {
    const opts: ImportPathOptions = context.options ?? {};
    const packages = new Set(opts.packages ?? []);
    const components = new Set(opts.components ?? []);

    const reportSpecifier = (nameNode: ts.Node, name: string) => {
      const pos = nameNode
        .getSourceFile()
        .getLineAndCharacterOfPosition(nameNode.getStart());
      const packagesText = opts.packages?.length
        ? opts.packages.join(', ')
        : 'configured packages';
      context.report({
        message: `Design system component "${name}" must be imported from ${packagesText}`,
        line: pos.line + 1,
        column: pos.character + 1,
      });
    };

    const resolveImportedComponentName = (
      localNameNode: ts.Identifier,
      fallbackName: string,
    ): string => {
      const symbolName = context.symbolResolution?.getSymbolName(localNameNode);
      return symbolName ?? fallbackName;
    };

    return {
      onNode(node) {
        if (!ts.isImportDeclaration(node)) return;
        if (!node.importClause) return;
        if (!ts.isStringLiteral(node.moduleSpecifier)) return;
        const moduleText = node.moduleSpecifier.text;
        if (packages.has(moduleText)) return;

        const clause = node.importClause;
        if (clause.name) {
          const importedName = resolveImportedComponentName(
            clause.name,
            clause.name.text,
          );
          if (components.has(importedName)) {
            reportSpecifier(clause.name, importedName);
          }
        }

        const bindings = clause.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const elem of bindings.elements) {
            const importedName = elem.propertyName?.text ?? elem.name.text;
            const resolvedName = resolveImportedComponentName(
              elem.name,
              importedName,
            );
            if (components.has(resolvedName)) {
              reportSpecifier(elem.name, resolvedName);
            }
          }
        }
      },
    };
  },
};
