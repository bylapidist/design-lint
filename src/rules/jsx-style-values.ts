import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';
import { guards } from '../utils/index.js';

const {
  ast: { isStyleName },
} = guards;

/**
 * Detects raw hard-coded values inside JSX inline style objects.
 * AI coding agents frequently produce JSX with inline styles that bypass the
 * design token system entirely, e.g. `style={{ color: '#3B82F6' }}`.
 *
 * This rule flags any string literal or numeric literal that appears as the
 * value of a JSX style property, excluding values that are clearly token
 * references (`var(--…)`) or zero.
 */
export const jsxStyleValuesRule: RuleModule = {
  name: 'design-system/jsx-style-values',
  meta: {
    description: 'disallow raw values inside JSX inline style objects',
    category: 'design-system',
    fixable: null,
    stability: 'stable' as const,
    rationale: {
      why: 'AI agents produce JSX inline styles that bypass the token system. Catching these at the PR stage prevents design drift accumulating at machine speed.',
      since: 'v8.0.0',
    },
    schema: z.void(),
  },
  create(context) {
    return {
      onNode(node) {
        if (!isJsxStyleAttribute(node)) return;
        checkJsxStyleAttribute(node, context);
      },
    };
  },
};

function isJsxStyleAttribute(node: ts.Node): node is ts.JsxAttribute {
  if (!ts.isJsxAttribute(node)) return false;
  const name = ts.isIdentifier(node.name) ? node.name.text : '';
  return name === 'style';
}

function checkJsxStyleAttribute(
  attr: ts.JsxAttribute,
  context: {
    report: (m: { message: string; line: number; column: number }) => void;
  },
): void {
  const init = attr.initializer;
  if (!init) return;

  const expr =
    ts.isJsxExpression(init) && init.expression ? init.expression : null;
  if (!expr || !ts.isObjectLiteralExpression(expr)) return;

  for (const prop of expr.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const propName = ts.isIdentifier(prop.name) ? prop.name.text : '';
    if (!isStyleName(prop.name)) continue;

    checkStyleValue(prop.initializer, propName, context);
  }
}

function checkStyleValue(
  valueNode: ts.Expression,
  propName: string,
  context: {
    report: (m: { message: string; line: number; column: number }) => void;
  },
): void {
  const sourceFile = valueNode.getSourceFile();
  const pos = sourceFile.getLineAndCharacterOfPosition(valueNode.getStart());
  const line = pos.line + 1;
  const column = pos.character + 1;

  if (ts.isStringLiteral(valueNode)) {
    const text = valueNode.text;
    if (
      isTokenReference(text) ||
      text === '' ||
      text === 'inherit' ||
      text === 'initial'
    ) {
      return;
    }
    context.report({
      message: `Raw style value "${text}" for "${propName}"; use a design token instead`,
      line,
      column,
    });
    return;
  }

  if (ts.isNumericLiteral(valueNode)) {
    const value = parseFloat(valueNode.text);
    if (value === 0) return;
    context.report({
      message: `Raw numeric value ${valueNode.text} for "${propName}"; use a spacing or dimension token instead`,
      line,
      column,
    });
  }
}

function isTokenReference(value: string): boolean {
  return value.startsWith('var(--') || value.startsWith('var( --');
}
