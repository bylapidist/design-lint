import ts from 'typescript';
import type { RuleModule } from '../core/types';

type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'named';

const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
const rgbRegex = /rgb\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}\s*\)/gi;
const rgbaRegex = /rgba\(\s*(?:\d{1,3}\s*,\s*){3}(?:0|1|0?\.\d+)\s*\)/gi;
const hslRegex = /hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)/gi;
const namedColors = [
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
];
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
