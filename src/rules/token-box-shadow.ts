import valueParser from 'postcss-value-parser';
import { formatRgb, parse } from 'culori';
import { rules, guards, collections, tokens } from '../utils/index.js';
import { buildColorString } from '../core/parser/normalize-colors.js';

const { tokenRule } = rules;
const {
  data: { isRecord },
} = guards;
const { toArray } = collections;
const { getPathRoot } = tokens;

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
      const items = toArray(val);
      const parts: string[] = [];
      for (const item of items) {
        if (!isRecord(item)) return null;
        const { offsetX, offsetY, blur, spread, color, inset } = item;
        const colorString = (() => {
          if (typeof color === 'string') return color;
          if (isRecord(color) && typeof color.colorSpace === 'string') {
            const components =
              Array.isArray(color.components) &&
              color.components.every(
                (component): component is number | 'none' =>
                  typeof component === 'number' || component === 'none',
              )
                ? color.components
                : null;
            if (!components) {
              return null;
            }
            const css = buildColorString(
              color.colorSpace,
              components,
              typeof color.alpha === 'number' ? color.alpha : undefined,
            );
            const parsed = parse(css);
            if (parsed) {
              const normalized = formatRgb(parsed);
              if (normalized) {
                return normalized
                  .replace(/\(\s+/g, '(')
                  .replace(/,\s+/g, ',')
                  .replace(/\s+\)/g, ')');
              }
            }
            return css;
          }
          return null;
        })();
        if (!colorString) return null;
        const ox = parseDim(offsetX);
        const oy = parseDim(offsetY);
        const bl = parseDim(blur);
        const sp = spread === undefined ? null : parseDim(spread);
        if (!ox || !oy || !bl) return null;
        const seg = [
          inset === true ? 'inset' : null,
          ox,
          oy,
          bl,
          sp,
          colorString,
        ]
          .filter((p): p is string => !!p)
          .join(' ');
        parts.push(seg);
      }
      return parts.join(', ');
    };
    for (const { path, value } of tokens) {
      if (getPathRoot(path) !== 'shadows') continue;
      const val = toString(value);
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
