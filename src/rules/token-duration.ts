import ts from 'typescript';
import valueParser from 'postcss-value-parser';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  ast: { isStyleValue },
  data: { isRecord },
} = guards;

export const durationRule = tokenRule({
  name: 'design-token/duration',
  meta: { description: 'enforce duration tokens', category: 'design-token' },
  tokens: 'duration',
  message:
    'design-token/duration requires duration tokens; configure tokens with $type "duration" under a "durations" group to enable this rule.',
  getAllowed(tokens) {
    const parse = (val: unknown): number | null => {
      if (!isRecord(val)) return null;
      const type = Reflect.get(val, 'durationType');
      const unit = Reflect.get(val, 'unit');
      const num = Reflect.get(val, 'value');
      if (
        typeof type !== 'string' ||
        typeof unit !== 'string' ||
        typeof num !== 'number'
      ) {
        return null;
      }
      if (!type.startsWith('css.')) return null;
      if (unit === 's') return num * 1000;
      if (unit === 'ms') return num;
      return null;
    };
    const allowed = new Set<number>();
    for (const { path, value } of tokens) {
      if (!path.startsWith('durations.')) continue;
      const num = parse(value);
      if (num !== null) allowed.add(num);
    }
    return allowed;
  },
  create(context, allowed) {
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected duration ${String(value)}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        const prop = decl.prop.toLowerCase();
        if (
          prop === 'transition' ||
          prop === 'transition-duration' ||
          prop === 'animation' ||
          prop === 'animation-duration'
        ) {
          let reported = false;
          valueParser(decl.value).walk((node) => {
            if (reported) return false;
            if (node.type === 'function') return false;
            if (node.type !== 'word') return;
            const parsed = valueParser.unit(node.value);
            if (!parsed || !parsed.unit) return;
            const unit = parsed.unit.toLowerCase();
            if (unit !== 'ms' && unit !== 's') return;
            const num = parseFloat(parsed.number);
            const ms = unit === 's' ? num * 1000 : num;
            if (!allowed.has(ms)) {
              context.report({
                message: `Unexpected duration ${node.value}`,
                line: decl.line,
                column: decl.column,
              });
              reported = true;
            }
          });
        }
      },
    };
  },
});
