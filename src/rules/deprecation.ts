import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule, TokenMetadata } from '../core/types.js';
import { pointerToTokenPath } from '../utils/tokens/token-view.js';
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
    const dtifTokens = context.getDtifTokens();
    const pathByPointer = new Map<string, string>();
    for (const token of dtifTokens) {
      pathByPointer.set(token.pointer, context.getTokenPath(token));
    }
    for (const token of dtifTokens) {
      const path = pathByPointer.get(token.pointer);
      if (!path) continue;
      const info = parseDeprecatedMetadata(
        token.metadata.deprecated,
        pathByPointer,
      );
      if (!info) continue;
      deprecated.set(path, info);
    }
    if (deprecated.size === 0) return {};
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
  value: TokenMetadata['deprecated'] | undefined,
  pathByPointer: Map<string, string>,
): { reason?: string; suggest?: string } | undefined {
  if (!value) return undefined;

  const pointer = value.supersededBy?.pointer;
  const suggestion = pointer
    ? pointerToReplacementName(pointer, pathByPointer)
    : undefined;

  const reasonParts: string[] = [];
  if (value.reason) {
    reasonParts.push(value.reason);
  }
  if (value.since) {
    reasonParts.push(`since ${value.since}`);
  }

  if (!reasonParts.length && suggestion) {
    reasonParts.push(`Use ${suggestion}`);
  }

  return {
    reason: reasonParts.length > 0 ? reasonParts.join(' ') : undefined,
    suggest: suggestion,
  };
}

function pointerToReplacementName(
  pointer: string,
  pathByPointer: Map<string, string>,
): string | undefined {
  if (!pointer) return undefined;
  if (pathByPointer.has(pointer)) {
    return pathByPointer.get(pointer);
  }
  if (!pointer.startsWith('#')) return undefined;
  const name = pointerToTokenPath(pointer);
  return name ?? undefined;
}
