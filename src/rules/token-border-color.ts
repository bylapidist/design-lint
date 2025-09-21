import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import { rules, color, tokens as tokenUtils } from '../utils/index.js';

const { tokenRule } = rules;
const { detectColorFormat } = color;
const { collectColorTokenValues } = tokenUtils;

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
    const values = new Set<string>();
    for (const token of tokens) {
      for (const candidate of collectColorTokenValues(token)) {
        values.add(candidate);
      }
    }
    return values;
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
