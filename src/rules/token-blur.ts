import valueParser from 'postcss-value-parser';
import { z } from 'zod';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  data: { isRecord },
} = guards;

interface BlurRuleOptions {
  units?: string[];
}

export const blurRule = tokenRule<BlurRuleOptions>({
  name: 'design-token/blur',
  meta: {
    description: 'enforce blur tokens',
    category: 'design-token',
    schema: z.object({ units: z.array(z.string()).optional() }).optional(),
  },
  tokens: 'dimension',
  message:
    'design-token/blur requires blur tokens; configure tokens with $type "dimension" under a "blurs" group to enable this rule.',
  getAllowed(tokens) {
    const parse = (val: unknown): number | null =>
      isRecord(val) && typeof val.value === 'number' ? val.value : null;
    const allowed = new Set<number>();
    for (const { path, value } of tokens) {
      if (!path.startsWith('blurs.')) continue;
      const num = parse(value);
      if (num !== null) allowed.add(num);
    }
    return allowed;
  },
  create(context, allowed) {
    const allowedUnits = new Set(
      (context.options?.units ?? ['px', 'rem', 'em']).map((u) =>
        u.toLowerCase(),
      ),
    );
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'filter' || decl.prop === 'backdrop-filter') {
          let reported = false;
          valueParser(decl.value).walk((node) => {
            if (reported) return false;
            if (node.type !== 'function' || node.value !== 'blur') return;
            if (node.nodes.length === 0) return;
            const arg = node.nodes[0];
            if (arg.type !== 'word') return;
            const parsed = valueParser.unit(arg.value);
            if (!parsed || !parsed.unit) return;
            const num = parseFloat(parsed.number);
            const unit = parsed.unit.toLowerCase();
            if (!isNaN(num) && allowedUnits.has(unit) && !allowed.has(num)) {
              context.report({
                message: `Unexpected blur ${arg.value}`,
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
