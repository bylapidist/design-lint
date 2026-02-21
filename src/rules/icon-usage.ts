import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

interface IconUsageOptions {
  /** Map of disallowed icon elements or components to their replacements. */
  substitutions?: Record<string, string>;
}

export const iconUsageRule: RuleModule<IconUsageOptions> = {
  name: 'design-system/icon-usage',
  meta: {
    description:
      'disallow raw svg elements or non design system icon components',
    category: 'component',
    schema: z
      .object({ substitutions: z.record(z.string(), z.string()).optional() })
      .optional(),
  },
  create(context) {
    const subs: Record<string, string> = {
      svg: 'Icon',
      ...(context.options?.substitutions ?? {}),
    };
    const lowerSubs: Record<string, string> = {};
    for (const [key, val] of Object.entries(subs)) {
      lowerSubs[key.toLowerCase()] = val;
    }
    const disallowed = new Set(Object.keys(lowerSubs));
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
        if (
          ts.isJsxOpeningElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxClosingElement(node)
        ) {
          const tag = node.tagName.getText();
          const tagLower = tag.toLowerCase();
          const isSvg = tagLower === 'svg';
          const isCustomElement = tag.includes('-');
          const isComponent =
            tag.startsWith(tag[0].toUpperCase()) || isCustomElement;
          if (disallowed.has(tagLower) && (isSvg || isComponent)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            const replacement = lowerSubs[tagLower];
            const tagText = ts.isJsxClosingElement(node)
              ? `</${tag}>`
              : `<${tag}>`;
            const safeFix = hasReplacementInScope(
              node.getSourceFile(),
              replacement,
            );
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
        }
      },
    };
  },
};
