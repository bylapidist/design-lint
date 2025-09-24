import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards, color } from '../utils/index.js';

const { tokenRule } = rules;
const { detectColorFormat } = color;
const {
  domain: { getTokenStringValue },
} = guards;

export const borderColorRule = tokenRule({
  name: 'design-token/border-color',
  meta: {
    description: 'enforce border-color tokens',
    category: 'design-token',
  },
  tokens: 'color',
  message:
    'design-token/border-color requires color tokens; configure tokens with $type "color" to enable this rule.',
  getAllowed(_context, dtifTokens: readonly DtifFlattenedToken[] = []) {
    return new Set(
      dtifTokens
        .map((token) => {
          const value = getTokenStringValue(token);
          return value ? value.toLowerCase() : null;
        })
        .filter((value): value is string => value !== null),
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
