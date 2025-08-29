import ts from 'typescript';
import type { RuleModule } from '../core/types.js';
import colorNames from '../color-names.js';

type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla' | 'named';

const hexRegex =
  /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const rgbRegex = /rgb\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}\s*\)/gi;
const rgbaRegex = /rgba\(\s*(?:\d{1,3}\s*,\s*){3}(?:0|1|0?\.\d+)\s*\)/gi;
const hslRegex = /hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)/gi;
const hslaRegex =
  /hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*,\s*(?:0|1|0?\.\d+)\s*\)/gi;

const namedRegex = new RegExp(`\\b(?:${colorNames.join('|')})\\b`, 'gi');

const patterns: { format: ColorFormat; regex: RegExp }[] = [
  { format: 'hex', regex: hexRegex },
  { format: 'rgb', regex: rgbRegex },
  { format: 'rgba', regex: rgbaRegex },
  { format: 'hsl', regex: hslRegex },
  { format: 'hsla', regex: hslaRegex },
  { format: 'named', regex: namedRegex },
];

interface ColorRuleOptions {
  allow?: ColorFormat[];
}

export const colorsRule: RuleModule = {
  name: 'design-token/colors',
  meta: { description: 'disallow raw colors' },
  create(context) {
    const colorTokens = context.tokens?.colors;
    if (!colorTokens || Object.keys(colorTokens).length === 0) {
      context.report({
        message:
          'design-token/colors requires color tokens; configure tokens.colors to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const allowed = new Set(
      Object.values(colorTokens).map((value) => value.toLowerCase()),
    );
    const opts = (context.options as ColorRuleOptions) || {};
    const allowFormats = new Set(opts.allow || []);

    const check = (text: string, line: number, column: number) => {
      for (const { format, regex } of patterns) {
        if (allowFormats.has(format)) continue;
        regex.lastIndex = 0;
        const matches = text.match(regex);
        if (matches) {
          for (const value of matches) {
            if (!allowed.has(value.toLowerCase())) {
              context.report({
                message: `Unexpected color ${value}`,
                line,
                column,
              });
              return;
            }
          }
        }
      }
    };

    return {
      onNode(node) {
        if (ts.isStringLiteral(node)) {
          const pos = node
            .getSourceFile()
            .getLineAndCharacterOfPosition(node.getStart());
          check(node.text, pos.line + 1, pos.character + 1);
        }
      },
      onCSSDeclaration(decl) {
        check(decl.value, decl.line, decl.column);
      },
    };
  },
};
