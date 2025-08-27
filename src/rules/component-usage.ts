import ts from 'typescript';
import type { RuleModule } from '../core/types';

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
    const disallowed = new Set(Object.keys(subs));
    return {
      onNode(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText();
          if (disallowed.has(tag)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Use ${subs[tag]} instead of <${tag}>`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
    };
  },
};
