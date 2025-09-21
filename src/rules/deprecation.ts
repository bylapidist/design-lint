import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';
import { guards, tokens } from '../utils/index.js';

const {
  ast: { isInNonStyleJsx },
} = guards;
const { pointerToPath } = tokens;

interface DeprecationInfo {
  replacementPointer?: string;
  replacementPath?: string;
}

export const deprecationRule: RuleModule = {
  name: 'design-system/deprecation',
  meta: {
    description: 'flag deprecated tokens',
    category: 'design-token',
    schema: z.void(),
  },
  create(context) {
    const deprecated = new Map<string, DeprecationInfo>();
    for (const { path, metadata } of context.getFlattenedTokens()) {
      const dep = metadata.deprecated;
      if (!dep) continue;
      if (dep === true) {
        deprecated.set(path, {});
        continue;
      }
      const replacementPointer = dep.$replacement;
      const replacementPath = pointerToPath(replacementPointer);
      deprecated.set(path, {
        replacementPointer,
        ...(replacementPath ? { replacementPath } : {}),
      });
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
            const suggestion = info?.replacementPath;
            const fallback = info?.replacementPointer;
            let replacementSuffix = '';
            if (suggestion) {
              replacementSuffix = `; use ${suggestion}`;
            } else if (fallback) {
              replacementSuffix = `; use ${fallback}`;
            }
            context.report({
              message: `Token ${node.text} is deprecated${replacementSuffix}.`,
              line: pos.line + 1,
              column: pos.character + 1,
              ...(suggestion
                ? {
                    fix: {
                      range: [node.getStart(), node.getEnd()],
                      text: `'${suggestion}'`,
                    },
                    suggest: suggestion,
                  }
                : {}),
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (names.has(decl.value)) {
          const info = deprecated.get(decl.value);
          const suggestion = info?.replacementPath ?? info?.replacementPointer;
          context.report({
            message: `Token ${decl.value} is deprecated${
              suggestion ? `; use ${suggestion}` : ''
            }.`,
            line: decl.line,
            column: decl.column,
            ...(info?.replacementPath ? { suggest: info.replacementPath } : {}),
          });
        }
      },
    };
  },
};
