import valueParser from 'postcss-value-parser';
import type { RuleModule, LegacyRuleContext } from '../core/types.js';

export const outlineRule: RuleModule<unknown, LegacyRuleContext> = {
  name: 'design-token/outline',
  meta: { description: 'enforce outline tokens', category: 'design-token' },
  create(context) {
    const outlineTokens = context.getFlattenedTokens('string');
    const normalize = (val: string): string =>
      valueParser.stringify(valueParser(val).nodes).trim();
    const allowed = new Set<string>();
    for (const { path, token } of outlineTokens) {
      if (!path.startsWith('outlines.')) continue;
      const val = token.$value;
      if (typeof val === 'string') allowed.add(normalize(val));
    }
    if (allowed.size === 0) {
      context.report({
        message:
          'design-token/outline requires outline tokens; configure tokens with $type "string" under an "outlines" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
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
};
