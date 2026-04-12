import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';
import { guards } from '../utils/index.js';

const {
  ast: { isStyleValue },
} = guards;

const SPACING_PROPS = new Set([
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginInline',
  'marginBlock',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingInline',
  'paddingBlock',
  'gap',
  'rowGap',
  'columnGap',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
]);

const CSS_SPACING_PROPS = new Set([
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-inline',
  'margin-block',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-inline',
  'padding-block',
  'gap',
  'row-gap',
  'column-gap',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
]);

const NUMERIC_PX_PATTERN = /^-?\d+(\.\d+)?(px|rem|em|vh|vw|%)?$/;

/**
 * Flags numeric literals used as spacing/sizing values in JSX and CSS.
 * AI agents frequently hard-code pixel values rather than referencing spacing
 * or dimension tokens, causing layout inconsistency across the design system.
 */
export const noHardcodedSpacingRule: RuleModule = {
  name: 'design-system/no-hardcoded-spacing',
  meta: {
    description: 'disallow hard-coded spacing and dimension values',
    category: 'design-system',
    fixable: null,
    stability: 'stable' as const,
    rationale: {
      why: 'Hard-coded spacing values break spacing scale consistency. AI agents in particular over-produce raw pixel values when no token context is available.',
      since: 'v8.0.0',
    },
    schema: z.void(),
  },
  create(context) {
    return {
      onNode(node) {
        if (!ts.isNumericLiteral(node) && !ts.isStringLiteral(node)) return;
        if (!isStyleValue(node)) return;

        const parent = node.parent;
        if (!ts.isPropertyAssignment(parent)) return;

        const propName = ts.isIdentifier(parent.name) ? parent.name.text : '';
        if (!SPACING_PROPS.has(propName)) return;

        const value = ts.isNumericLiteral(node) ? node.text : node.text;
        const numVal = parseFloat(value);
        if (numVal === 0) return;

        const sourceFile = node.getSourceFile();
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        context.report({
          message: `Hard-coded spacing value "${value}" for "${propName}"; use a spacing or dimension token`,
          line: pos.line + 1,
          column: pos.character + 1,
        });
      },
      onCSSDeclaration(decl) {
        if (!CSS_SPACING_PROPS.has(decl.prop.toLowerCase())) return;
        if (!NUMERIC_PX_PATTERN.test(decl.value.trim())) return;
        const numVal = parseFloat(decl.value);
        if (numVal === 0) return;
        context.report({
          message: `Hard-coded spacing value "${decl.value}" for "${decl.prop}"; use a spacing or dimension token`,
          line: decl.line,
          column: decl.column,
        });
      },
    };
  },
};
