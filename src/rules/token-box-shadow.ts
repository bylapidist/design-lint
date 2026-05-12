import valueParser from 'postcss-value-parser';
import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards, collections } from '../utils/index.js';

const { tokenRule } = rules;
const {
  data: { isRecord },
  domain: { isTokenInGroup },
} = guards;
const { toArray } = collections;

const normalize = (val: string): string =>
  valueParser.stringify(valueParser(val).nodes).trim();

export const boxShadowRule = tokenRule({
  name: 'design-token/box-shadow',
  meta: {
    description: 'enforce box-shadow tokens',
    category: 'design-token',
    fixable: null,
    stability: 'stable' as const,
    rationale: {
      why: 'Raw box-shadow values detach elevation from the design system, preventing systematic depth scale updates.',
      since: 'v8.0.0',
    },
  },
  tokens: 'shadow',
  message:
    'design-token/box-shadow requires shadow tokens; configure tokens with $type "shadow" under a "shadows" group to enable this rule.',
  getAllowed(_context, dtifTokens: readonly DtifFlattenedToken[] = []) {
    const allowed = new Set<string>();
    const parseDim = (v: unknown): string | null => {
      if (typeof v === 'string') return v;
      if (
        isRecord(v) &&
        typeof v.value === 'number' &&
        typeof v.unit === 'string'
      ) {
        // Omit units on zero values to match how authors write CSS.
        if (v.value === 0) return '0';
        return `${String(v.value)}${v.unit}`;
      }
      return null;
    };
    const colorToString = (color: unknown): string | null => {
      if (typeof color === 'string') return color;
      if (!isRecord(color)) return null;
      const { colorSpace, components } = color;
      if (colorSpace !== 'srgb' || !Array.isArray(components)) return null;
      const r: unknown = components[0];
      const g: unknown = components[1];
      const b: unknown = components[2];
      const a: unknown = components[3];
      if (
        typeof r !== 'number' ||
        typeof g !== 'number' ||
        typeof b !== 'number'
      )
        return null;
      const R = Math.round(r * 255);
      const G = Math.round(g * 255);
      const B = Math.round(b * 255);
      if (typeof a === 'number')
        return `rgba(${String(R)},${String(G)},${String(B)},${String(a)})`;
      return `rgb(${String(R)},${String(G)},${String(B)})`;
    };
    const toString = (val: unknown): string | null => {
      const items = toArray(val);
      const parts: string[] = [];
      for (const item of items) {
        if (!isRecord(item)) return null;
        const { offsetX, offsetY, blur, spread, color, inset } = item;
        const col = colorToString(color);
        if (!col) return null;
        const ox = parseDim(offsetX);
        const oy = parseDim(offsetY);
        const bl = parseDim(blur);
        const sp = spread === undefined ? null : parseDim(spread);
        if (!ox || !oy || !bl) return null;
        const seg = [inset === true ? 'inset' : null, ox, oy, bl, sp, col]
          .filter((p): p is string => !!p)
          .join(' ');
        parts.push(seg);
      }
      return parts.join(', ');
    };
    for (const token of dtifTokens) {
      if (!isTokenInGroup(token, 'shadows')) continue;
      const value = toString(token.value);
      if (value) allowed.add(normalize(value));
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
