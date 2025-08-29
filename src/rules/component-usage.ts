import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

export const componentUsageRule: RuleModule = {
  name: 'design-system/component-usage',
  meta: {
    description:
      'disallow raw HTML elements when design system components exist',
  },
  create(context) {
    const opts =
      (context.options as {
        substitutions?: Record<string, string>;
      }) || {};
    const subs: Record<string, string> = opts.substitutions || {};
    const lowerSubs: Record<string, string> = {};
    for (const [key, val] of Object.entries(subs)) {
      lowerSubs[key.toLowerCase()] = val;
    }
    const disallowed = new Set(Object.keys(lowerSubs));
    return {
      onNode(node) {
        if (
          ts.isJsxOpeningElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxClosingElement(node)
        ) {
          const tag = node.tagName.getText();
          const tagLower = tag.toLowerCase();
          if (disallowed.has(tagLower)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            const replacement = lowerSubs[tagLower];
            const tagText = ts.isJsxClosingElement(node)
              ? `</${tag}>`
              : `<${tag}>`;
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
        }
      },
    };
  },
};
