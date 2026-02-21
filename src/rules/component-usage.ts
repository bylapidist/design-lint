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

    return {
      onNode(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText();
          const replacement = resolveReplacement(node.tagName);
          if (!replacement) return;
          const pos = node
            .getSourceFile()
            .getLineAndCharacterOfPosition(node.getStart());
          const tagText = `<${tag}>`;
          context.report({
            message: `Use ${replacement} instead of ${tagText}`,
            line: pos.line + 1,
            column: pos.character + 1,
            fix: {
              range: [node.tagName.getStart(), node.tagName.getEnd()],
              text: replacement,
            },
          });
        }
      },
    };
  },
};
