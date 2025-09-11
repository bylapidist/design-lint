import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';
import { guards } from '../utils/index.js';

const {
  ast: { isInNonStyleJsx },
} = guards;

export const deprecationRule: RuleModule = {
  name: 'design-system/deprecation',
  meta: {
    description: 'flag deprecated tokens',
    category: 'design-token',
    schema: z.void(),
  },
  create(context) {
    const deprecated = new Map<string, { reason?: string; suggest?: string }>();
    for (const { path, token } of context.getFlattenedTokens()) {
      const dep = token.$deprecated;
      if (!dep) continue;
      let reason: string | undefined;
      let suggest: string | undefined;
      if (typeof dep === 'string') {
        reason = dep;
        const m = /\{([^}]+)\}/.exec(dep);
        if (m) suggest = m[1];
      }
      deprecated.set(path, { reason, suggest });
    }
    if (deprecated.size === 0) {
      context.report({
        message:
          'design-system/deprecation requires tokens with $deprecated to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const names = new Set(deprecated.keys());
    return {
      onNode(node) {
        if (ts.isStringLiteral(node)) {
          if (isInNonStyleJsx(node)) return;
          if (names.has(node.text)) {
            const info = deprecated.get(node.text);
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Token ${node.text} is deprecated${
                info?.reason ? `: ${info.reason}` : ''
              }`,
              line: pos.line + 1,
              column: pos.character + 1,
              ...(info?.suggest
                ? {
                    fix: {
                      range: [node.getStart(), node.getEnd()],
                      text: `'${info.suggest}'`,
                    },
                    suggest: info.suggest,
                  }
                : {}),
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (names.has(decl.value)) {
          const info = deprecated.get(decl.value);
          context.report({
            message: `Token ${decl.value} is deprecated${
              info?.reason ? `: ${info.reason}` : ''
            }`,
            line: decl.line,
            column: decl.column,
            ...(info?.suggest ? { suggest: info.suggest } : {}),
          });
        }
      },
    };
  },
};
