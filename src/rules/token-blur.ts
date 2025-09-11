import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../core/types.js';
import { isRecord } from '../utils/type-guards.js';

interface BlurRuleOptions {
  units?: string[];
}

export const blurRule: RuleModule<BlurRuleOptions> = {
  name: 'design-token/blur',
  meta: { description: 'enforce blur tokens', category: 'design-token' },
  create(context) {
    const blurTokens = context.getFlattenedTokens('dimension');
    const parse = (val: unknown): number | null => {
      if (isRecord(val) && typeof val.value === 'number') return val.value;
      return null;
    };
    const allowed = new Set<number>();
    for (const { path, token } of blurTokens) {
      if (!path.startsWith('blurs.')) continue;
      const num = parse(token.$value);
      if (num !== null) allowed.add(num);
    }
    if (allowed.size === 0) {
      context.report({
        message:
          'design-token/blur requires blur tokens; configure tokens with $type "dimension" under a "blurs" group to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
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
};
