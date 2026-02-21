import ts from 'typescript';
import type { DtifFlattenedToken } from '../core/types.js';
import { rules, guards } from '../utils/index.js';

const { tokenRule } = rules;
const {
  ast: { isStyleValue },
  domain: { isTokenInGroup },
} = guards;

function normalizeStylePropertyName(name: string): string {
  return name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function getPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  if (ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function isMatchingInlineStyleProperty(
  node: ts.Node,
  expectedProperty: string,
): boolean {
  for (let current: ts.Node = node; !ts.isSourceFile(current); ) {
    if (ts.isPropertyAssignment(current)) {
      const propertyName = getPropertyName(current.name);
      if (!propertyName) return false;
      return normalizeStylePropertyName(propertyName) === expectedProperty;
    }
    current = current.parent;
  }
  return false;
}

export const zIndexRule = tokenRule({
  name: 'design-token/z-index',
  meta: { description: 'enforce z-index tokens', category: 'design-token' },
  tokens: 'number',
  message:
    'design-token/z-index requires z-index tokens; configure tokens with $type "number" under a "zIndex" group to enable this rule.',
  getAllowed(_context, dtifTokens: readonly DtifFlattenedToken[] = []) {
    const allowed = new Set<number>();
    for (const token of dtifTokens) {
      if (!isTokenInGroup(token, 'zIndex')) continue;
      const val = token.value;
      if (typeof val === 'number') allowed.add(val);
    }
    return allowed;
  },
  create(context, allowed) {
    return {
      onNode(node) {
        if (!isStyleValue(node)) return;
        if (!isMatchingInlineStyleProperty(node, 'z-index')) return;
        if (ts.isNumericLiteral(node)) {
          const value = Number(node.text);
          if (!allowed.has(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Unexpected z-index ${String(value)}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (decl.prop === 'z-index') {
          const num = Number(decl.value.trim());
          if (!isNaN(num) && !allowed.has(num)) {
            context.report({
              message: `Unexpected z-index ${decl.value}`,
              line: decl.line,
              column: decl.column,
            });
          }
        }
      },
    };
  },
});
