import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import { tokenRule } from '../utils/token-rule.js';
import { detectColorFormat } from '../utils/color-format.js';

export const borderColorRule = tokenRule({
  name: 'design-token/border-color',
  meta: {
    description: 'enforce border-color tokens',
    category: 'design-token',
  },
  tokens: 'color',
  message:
    'design-token/border-color requires color tokens; configure tokens with $type "color" to enable this rule.',
  getAllowed(tokens) {
    return new Set(
      tokens
        .map(({ token }) => {
          const v = token.$value;
          return typeof v === 'string' && !v.startsWith('{')
            ? v.toLowerCase()
            : null;
        })
        .filter((v): v is string => v !== null),
    );
  },
  create(context, allowed) {
    return {
      onCSSDeclaration(decl) {
        if (/^border(-(top|right|bottom|left))?-color$/.test(decl.prop)) {
          valueParser(decl.value).walk((node) => {
            const value = valueParser.stringify(node);
            const format = detectColorFormat(value);
            if (!format) return;
            if (format !== 'named' && !colorString.get(value)) return;
            if (!allowed.has(value.toLowerCase())) {
              context.report({
                message: `Unexpected border color ${value}`,
                line: decl.line,
                column: decl.column + node.sourceIndex,
              });
              return false;
            }
          });
        }
      },
    };
  },
});
