import ts from 'typescript';
import type { RuleModule } from '../core/types';

export const spacingRule: RuleModule = {
  name: 'design-token/spacing',
  meta: { description: 'enforce spacing scale' },
  create(context) {
    const spacingTokens = context.tokens?.spacing;
    if (!spacingTokens || Object.keys(spacingTokens).length === 0) {
      context.report({
        message:
          'design-token/spacing requires spacing tokens; configure tokens.spacing to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const allowed = new Set(Object.values(spacingTokens));
    const opts =
      (context.options as { base?: number; units?: string[] } | undefined) ??
      {};
    const base = opts.base ?? 4;
    const isAllowed = (n: number) => allowed.has(n) || n % base === 0;
    const allowedUnits = new Set(
      (opts.units ?? ['px', 'rem', 'em']).map((u) => u.toLowerCase()),
    );
    const stripFunctions = (value: string) => {
      let result = '';
      for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (/[a-zA-Z_-]/.test(ch)) {
          let j = i + 1;
          while (j < value.length && /[\w-]/.test(value[j])) j++;
          if (value[j] === '(') {
            let depth = 1;
            i = j;
            while (++i < value.length && depth > 0) {
              const c = value[i];
              if (c === '(') depth++;
              else if (c === ')') depth--;
            }
            continue;
          }
        }
        result += ch;
      }
      return result;
    };
    return {
      onNode(node) {
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!isAllowed(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected spacing ${value}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        const stripped = stripFunctions(decl.value);
        const matches = stripped.matchAll(/(-?\d*\.?\d+)([a-z%]*)/gi);
        for (const m of matches) {
          const num = parseFloat(m[1]);
          const unit = m[2].toLowerCase();
          if (!isNaN(num) && allowedUnits.has(unit) && !isAllowed(num)) {
            context.report({
              message: `Unexpected spacing ${m[0]}`,
              line: decl.line,
              column: decl.column,
            });
            break;
          }
        }
      },
    };
  },
};
