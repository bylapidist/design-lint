import valueParser from 'postcss-value-parser';
import { tokenRule } from '../utils/token-rule.js';
import { isRecord } from '../utils/type-guards/index.js';

const normalize = (val: string): string =>
  valueParser.stringify(valueParser(val).nodes).trim();

export const boxShadowRule = tokenRule({
  name: 'design-token/box-shadow',
  meta: { description: 'enforce box-shadow tokens', category: 'design-token' },
  tokens: 'shadow',
  message:
    'design-token/box-shadow requires shadow tokens; configure tokens with $type "shadow" under a "shadows" group to enable this rule.',
  getAllowed(tokens) {
    const allowed = new Set<string>();
    const parseDim = (v: unknown): string | null => {
      if (typeof v === 'string') return v;
      if (
        isRecord(v) &&
        typeof v.value === 'number' &&
        typeof v.unit === 'string'
      ) {
        return `${String(v.value)}${v.unit}`;
      }
      return null;
    };
    const toString = (val: unknown): string | null => {
      const items = Array.isArray(val) ? val : [val];
      const parts: string[] = [];
      for (const item of items) {
        if (!isRecord(item)) return null;
        const { offsetX, offsetY, blur, spread, color, inset } = item;
        if (typeof color !== 'string') return null;
        const ox = parseDim(offsetX);
        const oy = parseDim(offsetY);
        const bl = parseDim(blur);
        const sp = spread === undefined ? null : parseDim(spread);
        if (!ox || !oy || !bl) return null;
        const seg = [inset === true ? 'inset' : null, ox, oy, bl, sp, color]
          .filter((p): p is string => !!p)
          .join(' ');
        parts.push(seg);
      }
      return parts.join(', ');
    };
    for (const { path, token } of tokens) {
      if (!path.startsWith('shadows.')) continue;
      const val = toString(token.$value);
      if (val) allowed.add(normalize(val));
    }
    return allowed;
  },
  create(context, allowed) {
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
});
