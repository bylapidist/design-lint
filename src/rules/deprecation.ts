import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';
import { pointerToLegacyPath } from '../core/dtif/legacy-adapter.js';
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
    for (const { path, metadata } of context.getFlattenedTokens()) {
      const info = parseDeprecatedMetadata(metadata.deprecated);
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

function parseDeprecatedMetadata(
  value: boolean | string | undefined,
): { reason?: string; suggest?: string } | undefined {
  if (!value) return undefined;

  if (value === true) {
    return {};
  }

  if (typeof value === 'string') {
    const suggestion = pointerToReplacementName(value);
    if (suggestion) {
      return { reason: `Use ${suggestion}`, suggest: suggestion };
    }
    return { reason: value };
  }

  return undefined;
}

function pointerToReplacementName(pointer: string): string | undefined {
  if (!pointer) return undefined;
  if (!pointer.startsWith('#')) return undefined;
  const name = pointerToLegacyPath(pointer);
  return name ?? undefined;
}
