import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

interface ComponentPrefixOptions {
  prefix?: string;
}

function getJsxTagName(node: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(node)) {
    return node.text;
  }

  if (
    node.kind === ts.SyntaxKind.PropertyAccessExpression ||
    node.kind === ts.SyntaxKind.JsxNamespacedName
  ) {
    return node.getText();
  }

  return 'this';
}

function isSimpleFixableTagName(
  node: ts.JsxTagNameExpression,
): node is ts.Identifier {
  return ts.isIdentifier(node);
}

function getRequiredPrefix(tag: string, prefix: string): string {
  if (!tag.includes('-')) {
    return prefix;
  }

  return prefix.endsWith('-') ? prefix : `${prefix}-`;
}

export const componentPrefixRule: RuleModule<ComponentPrefixOptions> = {
  name: 'design-system/component-prefix',
  meta: {
    description: 'enforce a prefix for design system components',
    category: 'component',
    schema: z.object({ prefix: z.string().optional() }).optional(),
  },
  create(context) {
    const prefix = context.options?.prefix ?? 'DS';
    return {
      onNode(node) {
        if (
          ts.isJsxOpeningElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxClosingElement(node)
        ) {
          const tag = getJsxTagName(node.tagName);
          if (!tag) return;

          const isCustomElement = tag.includes('-');
          const isPascalCaseComponent = /^[A-Z]/.test(tag);
          const isComplexTagName =
            node.tagName.kind === ts.SyntaxKind.PropertyAccessExpression ||
            node.tagName.kind === ts.SyntaxKind.JsxNamespacedName ||
            node.tagName.kind === ts.SyntaxKind.ThisKeyword;
          const isComponent =
            isPascalCaseComponent || isCustomElement || isComplexTagName;
          if (!isComponent) return; // ignore standard HTML tags

          const requiredPrefix = getRequiredPrefix(tag, prefix);

          if (!tag.startsWith(requiredPrefix)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.tagName.getStart());
            context.report({
              message: `Component "${tag}" should be prefixed with "${requiredPrefix}"`,
              line: pos.line + 1,
              column: pos.character + 1,
              fix: isSimpleFixableTagName(node.tagName)
                ? {
                    range: [node.tagName.getStart(), node.tagName.getEnd()],
                    text: `${requiredPrefix}${tag}`,
                  }
                : undefined,
            });
          }
        }
      },
    };
  },
};
