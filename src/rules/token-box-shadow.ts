import valueParser from 'postcss-value-parser';
import type { RuleModule, LegacyRuleContext } from '../core/types.js';

export const boxShadowRule: RuleModule<unknown, LegacyRuleContext> = {
  name: 'design-token/box-shadow',
  meta: { description: 'enforce box-shadow tokens', category: 'design-token' },
  create(context) {
    const shadowTokens = context.getFlattenedTokens('shadow');
    const normalize = (val: string): string =>
      valueParser.stringify(valueParser(val).nodes).trim();
    const allowed = new Set<string>();
    const toString = (val: unknown): string | null => {
      const items = Array.isArray(val) ? val : [val];
      const parts: string[] = [];
      for (const item of items) {
        if (!item || typeof item !== 'object') return null;
        const { offsetX, offsetY, blur, spread, color, inset } = item as Record<
          string,
          unknown
        >;
        if (
          typeof offsetX !== 'string' ||
          typeof offsetY !== 'string' ||
          typeof blur !== 'string' ||
          typeof color !== 'string'
        )
          return null;
        const seg = [
          inset === true ? 'inset' : null,
          offsetX,
          offsetY,
          blur,
          typeof spread === 'string' ? spread : null,
          color,
        ]
          .filter((p): p is string => !!p)
          .join(' ');
        parts.push(seg);
      }
      return parts.join(', ');
    };
    for (const { path, token } of shadowTokens) {
      if (!path.startsWith('shadows.')) continue;
      const val = toString(token.$value);
      if (val) allowed.add(normalize(val));
    }
    if (allowed.size === 0) {
      context.report({
        message:
          'design-token/box-shadow requires shadow tokens; configure tokens with $type "shadow" under a "shadows" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
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
