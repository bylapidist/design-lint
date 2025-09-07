import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

interface NoInlineStylesOptions {
  /** When true, the rule will ignore class/className attributes. */
  ignoreClassName?: boolean;
}

export const noInlineStylesRule: RuleModule<NoInlineStylesOptions> = {
  name: 'design-system/no-inline-styles',
  meta: {
    description:
      'disallow inline style or className attributes on design system components',
  },
  create(context) {
    const ignoreClassName = context.options?.ignoreClassName ?? false;
    return {
      onNode(node) {
        if (!ts.isJsxOpeningLikeElement(node)) return;
        const tag = node.tagName.getText();
        const isCustomElement = tag.includes('-');
        const isComponent = tag[0] === tag[0].toUpperCase() || isCustomElement;
        if (!isComponent) return;
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
