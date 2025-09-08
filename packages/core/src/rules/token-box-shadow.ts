import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../core/token-utils.js';

export const boxShadowRule: RuleModule = {
  name: 'design-token/box-shadow',
  meta: { description: 'enforce box-shadow tokens' },
  create(context) {
    const shadowTokens = context.tokens.shadows;
    if (
      !shadowTokens ||
      (Array.isArray(shadowTokens)
        ? shadowTokens.length === 0
        : Object.keys(shadowTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/box-shadow requires shadow tokens; configure tokens.shadows to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(shadowTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'box-shadow') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, shadowTokens)) {
              const suggest = name ? closestToken(name, shadowTokens) : null;
              context.report({
                message: `Unexpected box shadow ${decl.value}`,
                line: decl.line,
                column: decl.column,
                suggest: suggest ?? undefined,
              });
            }
          }
        },
      };
    }
    const normalize = (val: string): string =>
      valueParser.stringify(valueParser(val).nodes).trim();
    const allowed = new Set(
      Object.values(shadowTokens).map((v) => normalize(v)),
    );
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'box-shadow') {
          const parsed = valueParser(decl.value);
          const segments: string[] = [];
          let current: valueParser.Node[] = [];
          parsed.nodes.forEach((node) => {
            if (node.type === 'div' && node.value === ',') {
              const seg = normalize(valueParser.stringify(current));
              if (seg) segments.push(seg);
              current = [];
            } else {
              current.push(node);
            }
          });
          const last = normalize(valueParser.stringify(current));
          if (last) segments.push(last);
          for (const seg of segments) {
            const nodes = valueParser(seg).nodes;
            if (nodes.length === 1 && nodes[0].type === 'function') {
              continue;
            }
            if (!allowed.has(seg)) {
              context.report({
                message: `Unexpected box shadow ${seg}`,
                line: decl.line,
                column: decl.column,
              });
              break;
            }
          }
        }
      },
    };
  },
};
