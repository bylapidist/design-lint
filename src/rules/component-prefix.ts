import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

interface ComponentPrefixOptions {
  prefix?: string;
}

export const componentPrefixRule: RuleModule = {
  name: 'design-system/component-prefix',
  meta: {
    description: 'enforce a prefix for design system components',
  },
  create(context) {
    const opts = (context.options as ComponentPrefixOptions) || {};
    const prefix = opts.prefix || 'DS';
    return {
      onNode(node) {
        if (
          ts.isJsxOpeningElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxClosingElement(node)
        ) {
          const tag = node.tagName.getText();
          if (!tag) return;
          const isCustomElement = tag.includes('-');
          const isComponent =
            tag[0] === tag[0].toUpperCase() || isCustomElement;
          if (!isComponent) return; // ignore standard HTML tags
          if (!tag.startsWith(prefix)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.tagName.getStart());
            context.report({
              message: `Component "${tag}" should be prefixed with "${prefix}"`,
              line: pos.line + 1,
              column: pos.character + 1,
              fix: {
                range: [node.tagName.getStart(), node.tagName.getEnd()],
                text: `${prefix}${tag}`,
              },
            });
          }
        }
      },
    };
  },
};
