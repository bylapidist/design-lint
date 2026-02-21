import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

interface NoInlineStylesOptions {
  /** When true, the rule will ignore class/className attributes. */
  ignoreClassName?: boolean;
  /** Explicit design system component names to target. */
  components?: string[];
  /** Package specifiers considered design-system import origins. */
  importOrigins?: string[];
}

export const noInlineStylesRule: RuleModule<NoInlineStylesOptions> = {
  name: 'design-system/no-inline-styles',
  meta: {
    description:
      'disallow inline style or className attributes on design system components',
    category: 'component',
    schema: z
      .object({
        ignoreClassName: z.boolean().optional(),
        components: z.array(z.string()).optional(),
        importOrigins: z.array(z.string()).optional(),
      })
      .optional(),
  },
  create(context) {
    const ignoreClassName = context.options?.ignoreClassName ?? false;
    const configuredComponents = new Set(context.options?.components ?? []);
    const configuredOrigins = new Set(context.options?.importOrigins ?? []);

    const resolveImportOrigin = (tagName: ts.JsxTagNameExpression): string => {
      const symbolResolution = context.symbolResolution;
      if (!symbolResolution) {
        return '';
      }

      const candidates = [
        symbolResolution.getSymbolAtLocation(tagName),
        symbolResolution.resolveSymbol(tagName),
      ];

      for (const candidate of candidates) {
        if (!candidate) {
          continue;
        }

        for (const declaration of candidate.declarations ?? []) {
          if (ts.isImportSpecifier(declaration)) {
            const parent = declaration.parent.parent.parent;
            if (ts.isImportDeclaration(parent)) {
              const moduleSpecifier = parent.moduleSpecifier;
              if (ts.isStringLiteral(moduleSpecifier)) {
                return moduleSpecifier.text;
              }
            }
          }
          if (ts.isImportClause(declaration)) {
            const parent = declaration.parent;
            if (ts.isImportDeclaration(parent)) {
              const moduleSpecifier = parent.moduleSpecifier;
              if (ts.isStringLiteral(moduleSpecifier)) {
                return moduleSpecifier.text;
              }
            }
          }
        }
      }

      return '';
    };

    const shouldCheckTag = (
      tag: string,
      tagName: ts.JsxTagNameExpression,
    ): boolean => {
      const symbolName =
        context.symbolResolution?.getSymbolName(tagName) ?? tag;
      if (
        configuredComponents.has(symbolName) ||
        configuredComponents.has(tag)
      ) {
        return true;
      }
      if (configuredOrigins.size > 0) {
        const importOrigin = resolveImportOrigin(tagName);
        if (importOrigin.length === 0) return false;
        return configuredOrigins.has(importOrigin);
      }
      return configuredComponents.size > 0;
    };

    return {
      onNode(node) {
        if (!ts.isJsxOpeningLikeElement(node)) return;
        const tag = node.tagName.getText();
        const isCustomElement = tag.includes('-');
        const isComponent =
          tag.startsWith(tag[0].toUpperCase()) || isCustomElement;
        if (!isComponent) return;
        if (!shouldCheckTag(tag, node.tagName)) return;
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue;
          const name = attr.name.getText();
          if (name === 'style') {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(attr.getStart());
            context.report({
              message: `Unexpected style attribute on ${tag}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
            continue;
          }
          const isClassName = name === 'className' || name === 'class';
          if (!ignoreClassName && isClassName) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(attr.getStart());
            context.report({
              message: `Unexpected ${name} attribute on ${tag}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
    };
  },
};
