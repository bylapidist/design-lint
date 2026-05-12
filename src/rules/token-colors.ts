import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import colorString from 'color-string';
import { z } from 'zod';
import type { DtifFlattenedToken, Fix } from '../core/types.js';
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
  strictReference?: boolean;
}

export const colorsRule = tokenRule<ColorRuleOptions>({
  name: 'design-token/colors',
  meta: {
    description: 'disallow raw colors',
    category: 'design-token',
    fixable: 'code' as const,
    stability: 'stable' as const,
    rationale: {
      why: 'Raw color values sever the link between code and the color palette. A single token rename requires grep-and-replace instead of a single config change.',
      since: 'v8.0.0',
    },
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
        strictReference: z.boolean().optional(),
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
    const strictReference = opts.strictReference ?? false;
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

    const valueToVar = new Map<string, string>();
    for (const token of context.getDtifTokens('color')) {
      const v = getTokenStringValue(token);
      if (v) {
        const varName = pointerToVarName(token.pointer);
        valueToVar.set(v.toLowerCase(), varName);
      }
    }

    const makeFix = (
      rawValue: string,
      docOffset: number | undefined,
    ): Fix | undefined => {
      if (docOffset === undefined) return undefined;
      const varName = valueToVar.get(rawValue.toLowerCase());
      if (!varName) return undefined;
      return {
        range: [docOffset, docOffset + rawValue.length],
        text: `var(${varName})`,
      };
    };

    const checkCSS = (
      text: string,
      line: number,
      column: number,
      valueOffset: number | undefined,
    ) => {
      const parsed = valueParser(text);
      parsed.walk((node) => {
        const value = valueParser.stringify(node);
        const format = detectColorFormat(value);
        if (!format || allowFormats.has(format)) return;
        if (parserFormats.has(format) && !colorString.get(value)) return;
        if (!allowed.has(value.toLowerCase()) || strictReference) {
          const docOffset =
            valueOffset !== undefined
              ? valueOffset + node.sourceIndex
              : undefined;
          context.report({
            message: `Unexpected color ${value}`,
            line,
            column: column + node.sourceIndex,
            fix: makeFix(value, docOffset),
          });
          return false;
        }
      });
    };

    const checkNode = (
      text: string,
      line: number,
      column: number,
      contentOffset: number,
    ) => {
      const parsed = valueParser(text);
      parsed.walk((node) => {
        const value = valueParser.stringify(node);
        const format = detectColorFormat(value);
        if (!format || allowFormats.has(format)) return;
        if (parserFormats.has(format) && !colorString.get(value)) return;
        if (!allowed.has(value.toLowerCase()) || strictReference) {
          const docOffset = contentOffset + node.sourceIndex;
          context.report({
            message: `Unexpected color ${value}`,
            line,
            column: column + node.sourceIndex,
            fix: makeFix(value, docOffset),
          });
          return false;
        }
      });
    };

    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        const sourceFile = node.getSourceFile();
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)
        ) {
          const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          // +1 to skip the opening quote character
          checkNode(
            node.text,
            pos.line + 1,
            pos.character + 2,
            node.getStart() + 1,
          );
        } else if (ts.isTemplateExpression(node)) {
          const headPos = sourceFile.getLineAndCharacterOfPosition(
            node.head.getStart(),
          );
          checkNode(
            node.head.text,
            headPos.line + 1,
            headPos.character + 2,
            node.head.getStart() + 1,
          );
          for (const span of node.templateSpans) {
            const litPos = sourceFile.getLineAndCharacterOfPosition(
              span.literal.getStart(),
            );
            // Template middle/tail starts with }, so content is at +1
            checkNode(
              span.literal.text,
              litPos.line + 1,
              litPos.character + 2,
              span.literal.getStart() + 1,
            );
          }
        }
      },
      onCSSDeclaration(decl) {
        checkCSS(decl.value, decl.line, decl.column, decl.valueOffset);
      },
    };
  },
});

function pointerToVarName(pointer: string): string {
  const segments = pointer.replace(/^#\//, '').split('/');
  return `--${segments.join('-')}`;
}
