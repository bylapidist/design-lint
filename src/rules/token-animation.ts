import valueParser from 'postcss-value-parser';
import { rules } from '../utils/index.js';

const { tokenRule } = rules;

const normalize = (val: string): string =>
  valueParser.stringify(valueParser(val).nodes).trim();

export const animationRule = tokenRule({
  name: 'design-token/animation',
  meta: { description: 'enforce animation tokens', category: 'design-token' },
  tokens: 'string',
  message:
    'design-token/animation requires animation tokens; configure tokens with $type "string" under an "animations" group to enable this rule.',
  getAllowed(tokens) {
    const allowed = new Set<string>();
    for (const { path, value } of tokens) {
      if (!path.startsWith('animations.')) continue;
      const val = value;
      if (typeof val === 'string') {
        allowed.add(normalize(val));
      }
    }
    return allowed;
  },
  create(context, allowed) {
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'animation') {
          if (decl.value.includes('var(')) return;
          const norm = normalize(decl.value);
          if (!allowed.has(norm)) {
            context.report({
              message: `Unexpected animation ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
});
