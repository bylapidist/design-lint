import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';
import { pointerToPath } from '../core/dtif/flatten-tokens.js';
import { guards } from '../utils/index.js';

const {
  ast: { isInNonStyleJsx },
  data: { isRecord },
} = guards;

interface DeprecationInfo {
  reason?: string;
  suggest?: string;
}

function isJsonPointer(value: string): value is `#${string}` {
  return value.startsWith('#');
}

function toDeprecationInfo(value: unknown): DeprecationInfo | undefined {
  if (value === undefined || value === false) {
    return undefined;
  }
  if (value === true) {
    return {};
  }
  if (typeof value === 'string') {
    if (isJsonPointer(value)) {
      const suggestion = pointerToPath(value) || value;
      return { reason: `Use ${suggestion}`, suggest: suggestion };
    }
    const info: DeprecationInfo = { reason: value };
    const match = /\{([^}]+)\}/.exec(value);
    if (match) {
      info.suggest = match[1];
    }
    return info;
  }
  if (isRecord(value)) {
    const replacement = value.$replacement;
    if (typeof replacement === 'string' && isJsonPointer(replacement)) {
      const suggestion = pointerToPath(replacement) || replacement;
      return { reason: `Use ${suggestion}`, suggest: suggestion };
    }
    return {};
  }
  return {};
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
      const info = toDeprecationInfo(metadata.deprecated);
      if (!info) continue;
      deprecated.set(path, info);
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
