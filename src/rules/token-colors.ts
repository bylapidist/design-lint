import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import { z } from 'zod';
import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards, color } from '../utils/index.js';
import type { ColorFormat } from '../core/index.js';

const { tokenRule } = rules;
const {
  ast: { isStyleValue },
  domain: { getTokenStringValue },
} = guards;
const { detectColorFormat } = color;

interface ColorRuleOptions {
  allow?: ColorFormat[];
}

export const colorsRule = tokenRule<ColorRuleOptions>({
  name: 'design-token/colors',
  meta: {
    description: 'disallow raw colors',
    category: 'design-token',
    schema: z
      .object({
        allow: z
          .array(
            z.enum([
              'hex',
              'rgb',
              'rgba',
              'hsl',
              'hsla',
              'hwb',
              'lab',
              'lch',
              'color',
              'named',
            ]),
          )
          .optional(),
      })
      .optional(),
  },
  tokens: 'color',
  message:
    'design-token/colors requires color tokens; configure tokens with $type "color" to enable this rule.',
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
    const opts = context.options ?? {};
    const allowFormats = new Set(opts.allow ?? []);
    const parserFormats = new Set<ColorFormat>([
      'hex',
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'named',
    ]);

    const check = (text: string, line: number, column: number) => {
      const parsed = valueParser(text);
      parsed.walk((node) => {
        const value = valueParser.stringify(node);
        const format = detectColorFormat(value);
        if (!format || allowFormats.has(format)) return;
        if (parserFormats.has(format) && !colorString.get(value)) return;
        if (!allowed.has(value.toLowerCase())) {
          context.report({
            message: `Unexpected color ${value}`,
            line,
            column: column + node.sourceIndex,
          });
          return false;
        }
      });
    };

    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        const sourceFile = node.getSourceFile();
        const handle = (text: string, n: ts.Node) => {
          const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart());
          check(text, pos.line + 1, pos.character + 1);
        };
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)
        ) {
          handle(node.text, node);
        } else if (ts.isTemplateExpression(node)) {
          handle(node.head.text, node.head);
          for (const span of node.templateSpans) {
            handle(span.literal.text, span.literal);
          }
        }
      },
      onCSSDeclaration(decl) {
        check(decl.value, decl.line, decl.column);
      },
    };
  },
});
