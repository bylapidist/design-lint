import valueParser from 'postcss-value-parser';
import type { RuleModule } from '../engine/types.js';
import {
  matchToken,
  extractVarName,
  closestToken,
} from '../engine/token-utils.js';

interface BlurRuleOptions {
  units?: string[];
}

export const blurRule: RuleModule<BlurRuleOptions> = {
  name: 'design-token/blur',
  meta: { description: 'enforce blur tokens' },
  create(context) {
    const blurTokens = context.tokens.blurs;
    if (
      !blurTokens ||
      (Array.isArray(blurTokens)
        ? blurTokens.length === 0
        : Object.keys(blurTokens).length === 0)
    ) {
      context.report({
        message:
          'design-token/blur requires blur tokens; configure tokens.blurs to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    if (Array.isArray(blurTokens)) {
      return {
        onCSSDeclaration(decl) {
          if (decl.prop === 'filter' || decl.prop === 'backdrop-filter') {
            const name = extractVarName(decl.value);
            if (!name || !matchToken(name, blurTokens)) {
              const suggest = name ? closestToken(name, blurTokens) : null;
              context.report({
                message: `Unexpected blur ${decl.value}`,
                line: decl.line,
                column: decl.column,
                suggest: suggest ?? undefined,
              });
            }
          }
        },
      };
    }
    const parse = (val: unknown): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = valueParser.unit(val);
        if (parsed) return parseFloat(parsed.number);
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
      return null;
    };
    const allowed = new Set(
      Object.values(blurTokens)
        .map((v) => parse(v))
        .filter((n): n is number => n !== null),
    );
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
