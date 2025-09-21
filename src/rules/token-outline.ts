import valueParser from 'postcss-value-parser';
import { rules, tokens } from '../utils/index.js';

const { tokenRule } = rules;
const { getPathRoot } = tokens;

const normalize = (val: string): string =>
  valueParser.stringify(valueParser(val).nodes).trim();

export const outlineRule = tokenRule({
  name: 'design-token/outline',
  meta: { description: 'enforce outline tokens', category: 'design-token' },
  tokens: 'string',
  message:
    'design-token/outline requires outline tokens; configure tokens with $type "string" under an "outlines" group to enable this rule.',
  getAllowed(tokens) {
    const allowed = new Set<string>();
    for (const { path, value } of tokens) {
      if (getPathRoot(path) !== 'outlines') continue;
      const val = value;
      if (typeof val === 'string') allowed.add(normalize(val));
    }
    return allowed;
  },
  create(context, allowed) {
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'outline') {
          const norm = normalize(decl.value);
          if (!allowed.has(norm)) {
            context.report({
              message: `Unexpected outline ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
});
