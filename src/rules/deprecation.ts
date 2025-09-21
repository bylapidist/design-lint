import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';
import { guards, tokens } from '../utils/index.js';

const {
  ast: { isInNonStyleJsx },
} = guards;
const { normalizePath, getPathSegments } = tokens;

interface DeprecationInfo {
  canonical: string;
  reason?: string;
  replacement?: string;
}

function formatPointer(path: string): string {
  const normalized = normalizePath(path);
  if (!normalized) return normalized;
  return normalized.startsWith('/') ? `#${normalized}` : normalized;
}

function hasReplacement(value: unknown): value is { $replacement?: unknown } {
  return typeof value === 'object' && value !== null && '$replacement' in value;
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
    const register = (name: string, info: DeprecationInfo): void => {
      if (!name || deprecated.has(name)) return;
      deprecated.set(name, info);
    };
    for (const { path, metadata } of context.getFlattenedTokens()) {
      const deprecatedMeta = metadata.deprecated;
      if (!deprecatedMeta) continue;
      const dep: unknown = deprecatedMeta;
      const canonical = normalizePath(path);
      const info: DeprecationInfo = { canonical };
      if (typeof dep === 'string') {
        info.reason = dep;
      } else if (dep === true) {
        // No additional metadata beyond the deprecated flag.
      } else if (hasReplacement(dep)) {
        const replacement = dep.$replacement;
        if (typeof replacement === 'string') {
          info.replacement = normalizePath(replacement);
        }
      }
      register(canonical, info);
      if (canonical.startsWith('/')) {
        register(`#${canonical}`, info);
      }
      const segments = getPathSegments(canonical);
      if (segments.length) {
        register(segments.join('.'), info);
      }
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
    return {
      onNode(node) {
        if (ts.isStringLiteral(node)) {
          if (isInNonStyleJsx(node)) return;
          const info = deprecated.get(node.text);
          if (!info) return;
          const pos = node
            .getSourceFile()
            .getLineAndCharacterOfPosition(node.getStart());
          const pointer = formatPointer(info.canonical);
          const replacement = info.replacement
            ? formatPointer(info.replacement)
            : undefined;
          const message =
            info.reason ??
            (replacement
              ? `Token ${pointer} is deprecated; use ${replacement}`
              : `Token ${pointer} is deprecated`);
          context.report({
            message,
            line: pos.line + 1,
            column: pos.character + 1,
            ...(replacement
              ? {
                  fix: {
                    range: [node.getStart(), node.getEnd()],
                    text: `'${replacement}'`,
                  },
                  suggest: replacement,
                }
              : {}),
          });
        }
      },
      onCSSDeclaration(decl) {
        const info = deprecated.get(decl.value);
        if (!info) return;
        const pointer = formatPointer(info.canonical);
        const replacement = info.replacement
          ? formatPointer(info.replacement)
          : undefined;
        const message =
          info.reason ??
          (replacement
            ? `Token ${pointer} is deprecated; use ${replacement}`
            : `Token ${pointer} is deprecated`);
        context.report({
          message,
          line: decl.line,
          column: decl.column,
          ...(replacement ? { suggest: replacement } : {}),
        });
      },
    };
  },
};
