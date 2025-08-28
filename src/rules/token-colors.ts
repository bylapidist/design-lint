import ts from 'typescript';
import colorName from 'color-name';
import type { RuleModule } from '../core/types';

type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'named';

const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
const rgbRegex = /rgb\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}\s*\)/gi;
const rgbaRegex = /rgba\(\s*(?:\d{1,3}\s*,\s*){3}(?:0|1|0?\.\d+)\s*\)/gi;
const hslRegex = /hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)/gi;
const namedColors = Object.keys(colorName);
const namedRegex = new RegExp(`\\b(?:${namedColors.join('|')})\\b`, 'gi');

const patterns: { format: ColorFormat; regex: RegExp }[] = [
  { format: 'hex', regex: hexRegex },
  { format: 'rgb', regex: rgbRegex },
  { format: 'rgba', regex: rgbaRegex },
  { format: 'hsl', regex: hslRegex },
  { format: 'named', regex: namedRegex },
];

interface ColorRuleOptions {
  allow?: ColorFormat[];
}

export const colorsRule: RuleModule = {
  name: 'design-token/colors',
  meta: { description: 'disallow raw colors' },
  create(context) {
    const allowed = new Set(Object.values(context.tokens?.colors || {}));
    const opts = (context.options as ColorRuleOptions) || {};
    const allowFormats = new Set(opts.allow || []);

    const check = (text: string, line: number, column: number) => {
      for (const { format, regex } of patterns) {
        if (allowFormats.has(format)) continue;
        regex.lastIndex = 0;
        const matches = text.match(regex);
        if (matches) {
          for (const value of matches) {
            if (!allowed.has(value)) {
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
