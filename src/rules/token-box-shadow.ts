import valueParser from 'postcss-value-parser';
import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards, collections } from '../utils/index.js';

const { tokenRule } = rules;
const {
  data: { isRecord },
  domain: { isTokenInGroup },
} = guards;
const { toArray } = collections;

// Strip units from zero-valued dimensions so that "0px" and "0" compare equal.
const ZERO_UNIT_RE =
  /\b0(px|rem|em|%|vh|vw|vmin|vmax|cm|mm|in|pt|pc|ex|ch|fr)\b/g;

const normalize = (val: string): string => {
  const stringified = valueParser.stringify(valueParser(val).nodes).trim();
  return stringified.replace(ZERO_UNIT_RE, '0');
};

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
        return `${String(v.value)}${v.unit}`;
      }
      return null;
    };
    const colorToString = (color: unknown): string | null => {
      if (typeof color === 'string') return color;
      if (!isRecord(color)) return null;
      const { colorSpace, components } = color;
      if (typeof colorSpace !== 'string' || !Array.isArray(components))
        return null;
      const nums = components.map(Number);
      if (nums.some(isNaN)) return null;
      const [c0, c1, c2, c3] = nums;
      const alpha = typeof c3 === 'number' ? c3 : undefined;
      const alphaStr = alpha !== undefined ? ` / ${String(alpha)}` : '';

      // sRGB: use legacy rgba() so CSS authors can match with familiar notation.
      if (colorSpace === 'srgb') {
        const R = Math.round(c0 * 255);
        const G = Math.round(c1 * 255);
        const B = Math.round(c2 * 255);
        if (alpha !== undefined)
          return `rgba(${String(R)},${String(G)},${String(B)},${String(alpha)})`;
        return `rgb(${String(R)},${String(G)},${String(B)})`;
      }

      // CSS functions for perceptual spaces — components are already in the
      // natural range the CSS function expects.
      if (colorSpace === 'hsl')
        return `hsl(${String(c0)} ${String(c1 * 100)}% ${String(c2 * 100)}%${alphaStr})`;
      if (colorSpace === 'hwb')
        return `hwb(${String(c0)} ${String(c1 * 100)}% ${String(c2 * 100)}%${alphaStr})`;
      if (colorSpace === 'lab')
        return `lab(${String(c0)} ${String(c1)} ${String(c2)}${alphaStr})`;
      if (colorSpace === 'lch')
        return `lch(${String(c0)} ${String(c1)} ${String(c2)}${alphaStr})`;
      if (colorSpace === 'oklab')
        return `oklab(${String(c0)} ${String(c1)} ${String(c2)}${alphaStr})`;
      if (colorSpace === 'oklch')
        return `oklch(${String(c0)} ${String(c1)} ${String(c2)}${alphaStr})`;

      // display-p3, a98-rgb, prophoto-rgb, rec2020 and any future spaces use
      // the CSS color() function.
      return `color(${colorSpace} ${String(c0)} ${String(c1)} ${String(c2)}${alphaStr})`;
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
