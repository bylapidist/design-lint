import ts from 'typescript';
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
            tag[0] === tag[0].toUpperCase() || isCustomElement;
          if (disallowed.has(tagLower) && (isSvg || isComponent)) {
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
