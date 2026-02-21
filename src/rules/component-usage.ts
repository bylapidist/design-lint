import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

export interface ComponentUsageOptions {
  substitutions?: Record<string, string>;
}

export const componentUsageRule: RuleModule<ComponentUsageOptions> = {
  name: 'design-system/component-usage',
  meta: {
    description:
      'disallow raw HTML elements when design system components exist',
    category: 'component',
    schema: z
      .object({ substitutions: z.record(z.string(), z.string()).optional() })
      .optional(),
  },
  create(context) {
    const subs = context.options?.substitutions ?? {};
    const lowerSubs: Record<string, string> = {};
    for (const [key, val] of Object.entries(subs)) {
      lowerSubs[key.toLowerCase()] = val;
    }
    const disallowed = new Set(Object.keys(lowerSubs));

    const resolveReplacement = (
      node: ts.JsxTagNameExpression,
    ): string | null => {
      const symbolName = context.symbolResolution?.getSymbolName(node);
      if (symbolName) {
        if (symbolName in subs) return subs[symbolName];
        const symbolReplacement = lowerSubs[symbolName.toLowerCase()];
        if (symbolReplacement) return symbolReplacement;
      }
      const tagText = node.getText();
      const tagLower = tagText.toLowerCase();
      if (!disallowed.has(tagLower)) return null;
      return lowerSubs[tagLower] ?? null;
    };

    const hasReplacementInScope = (
      sourceFile: ts.SourceFile,
      replacement: string,
    ): boolean => {
      for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement)) {
          const importClause = statement.importClause;
          if (!importClause) continue;
          if (importClause.name?.text === replacement) return true;
          const namedBindings = importClause.namedBindings;
          if (!namedBindings) continue;
          if (ts.isNamespaceImport(namedBindings)) {
            if (namedBindings.name.text === replacement) return true;
            continue;
          }
          for (const element of namedBindings.elements) {
            if (element.name.text === replacement) return true;
          }
          continue;
        }
        if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) {
              if (declaration.name.text === replacement) return true;
            }
          }
          continue;
        }
        if (
          (ts.isFunctionDeclaration(statement) ||
            ts.isClassDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement) ||
            ts.isTypeAliasDeclaration(statement) ||
            ts.isEnumDeclaration(statement)) &&
          statement.name?.text === replacement
        ) {
          return true;
        }
      }
      return false;
    };

    return {
      onNode(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText();
          const replacement = resolveReplacement(node.tagName);
          if (!replacement) return;
          const safeFix =
            ts.isJsxSelfClosingElement(node) &&
            hasReplacementInScope(node.getSourceFile(), replacement);
          const pos = node
            .getSourceFile()
            .getLineAndCharacterOfPosition(node.getStart());
          const tagText = `<${tag}>`;
          context.report({
            message: `Use ${replacement} instead of ${tagText}`,
            line: pos.line + 1,
            column: pos.character + 1,
            fix: safeFix
              ? {
                  range: [node.tagName.getStart(), node.tagName.getEnd()],
                  text: replacement,
                }
              : undefined,
          });
        }
      },
    };
  },
};
