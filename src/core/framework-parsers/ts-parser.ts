import ts from 'typescript';
import { parseCSS } from './css-parser.js';
import type { LintMessage, RegisteredRuleListener } from '../types.js';
import type { ParserPassResult } from '../parser-registry.js';
import type { ParserPassOptions } from '../parser-registry.js';
import { normalizeStylePropertyName } from './reference-normalizer.js';
import {
  collectDeclarationTokenReferences,
  collectTsTokenReferences,
} from './token-references.js';
import {
  dispatchCSSDeclarationListener,
  dispatchNodeListener,
} from './listener-dispatch.js';

interface NodeRange {
  start: number;
  end: number;
}

interface JSXStyleObjectExtractionResult {
  declarations: {
    prop: string;
    value: string;
    line: number;
    column: number;
  }[];
  consumedValueRanges: NodeRange[];
}

type LiteralStyleValue =
  | { text: string; kind: 'string' }
  | { text: string; kind: 'number' };

export function lintTS(
  text: string,
  sourceId: string,
  listeners: RegisteredRuleListener[],
  messages: LintMessage[],
  options?: ParserPassOptions,
): ParserPassResult {
  const allowedTemplateTags = new Set(
    (options?.templateTags && options.templateTags.length > 0
      ? options.templateTags
      : ['styled', 'css', 'tw']
    )
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
  );
  const source = ts.createSourceFile(
    sourceId,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const tokenReferences: NonNullable<ParserPassResult['tokenReferences']> = [];
  const skippedNodeRanges: NodeRange[] = [];
  const dispatchContext = {
    listeners,
    messages,
    sourceId,
    failedHooks: new Set<string>(),
  };
  const getRootTag = (expr: ts.Expression): string | null => {
    if (ts.isIdentifier(expr)) return expr.text;
    if (
      ts.isPropertyAccessExpression(expr) ||
      ts.isElementAccessExpression(expr)
    ) {
      return getRootTag(expr.expression);
    }
    if (ts.isCallExpression(expr)) {
      return getRootTag(expr.expression);
    }
    return null;
  };
  const buildInterpolationPlaceholder = (text: string): string => {
    let insertedToken = false;
    let placeholder = '';
    for (const char of text) {
      if (char === '\n' || char === '\r') {
        placeholder += char;
        continue;
      }
      if (!insertedToken) {
        insertedToken = true;
        placeholder += '0';
        continue;
      }
      placeholder += ' ';
    }
    return placeholder;
  };
  const unwrapStyleExpression = (expression: ts.Expression): ts.Expression => {
    let current = expression;
    for (;;) {
      if (ts.isParenthesizedExpression(current)) {
        current = current.expression;
        continue;
      }
      if (ts.isAsExpression(current)) {
        current = current.expression;
        continue;
      }
      if (ts.isSatisfiesExpression(current)) {
        current = current.expression;
        continue;
      }
      if (ts.isNonNullExpression(current)) {
        current = current.expression;
        continue;
      }
      break;
    }
    return current;
  };
  const getStylePropertyName = (name: ts.PropertyName): string | null => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      return name.text;
    }
    if (ts.isNumericLiteral(name)) {
      return name.text;
    }
    // Non-support: computed property names are dynamic and cannot be mapped
    // to deterministic CSS declarations here.
    return null;
  };
  const getLiteralStyleValue = (
    value: ts.Expression,
  ): LiteralStyleValue | null => {
    if (ts.isStringLiteral(value)) {
      return { text: value.text, kind: 'string' };
    }
    if (ts.isNumericLiteral(value)) {
      return { text: value.text, kind: 'number' };
    }
    if (
      ts.isPrefixUnaryExpression(value) &&
      ts.isNumericLiteral(value.operand) &&
      (value.operator === ts.SyntaxKind.PlusToken ||
        value.operator === ts.SyntaxKind.MinusToken)
    ) {
      const sign = value.operator === ts.SyntaxKind.MinusToken ? '-' : '';
      return { text: `${sign}${value.operand.text}`, kind: 'number' };
    }
    // Non-support: expression values (template expressions, identifiers,
    // call expressions, etc.) are intentionally skipped in this JSX style
    // declaration extraction path.
    return null;
  };
  const extractJSXStyleDeclarations = (
    object: ts.ObjectLiteralExpression,
  ): JSXStyleObjectExtractionResult => {
    const declarations: JSXStyleObjectExtractionResult['declarations'] = [];
    const consumedValueRanges: NodeRange[] = [];
    const numericDeclarationPropsToConsume = new Set([
      'font-weight',
      'letter-spacing',
      'line-height',
      'opacity',
      'z-index',
    ]);
    const extractFromObject = (literalObject: ts.ObjectLiteralExpression) => {
      for (const property of literalObject.properties) {
        if (ts.isPropertyAssignment(property)) {
          const propertyName = getStylePropertyName(property.name);
          if (!propertyName) continue;
          const cssProperty = normalizeStylePropertyName(propertyName);
          const initializer = property.initializer;
          if (ts.isObjectLiteralExpression(initializer)) {
            // Nested style objects are traversed so nested literal entries can
            // still be normalized into CSS declarations when present.
            extractFromObject(initializer);
            continue;
          }
          const literalValue = getLiteralStyleValue(initializer);
          if (literalValue === null) continue;
          const position = source.getLineAndCharacterOfPosition(
            property.name.getStart(source),
          );
          declarations.push({
            prop: cssProperty,
            value: literalValue.text,
            line: position.line + 1,
            column: position.character + 1,
          });
          if (
            literalValue.kind === 'string' ||
            numericDeclarationPropsToConsume.has(cssProperty)
          ) {
            consumedValueRanges.push({
              start: initializer.getStart(source),
              end: initializer.getEnd(),
            });
          }
          continue;
        }
        // Non-support: spread, shorthand and method entries are dynamic and are
        // intentionally ignored for JSX style declaration extraction.
      }
    };
    extractFromObject(object);
    return { declarations, consumedValueRanges };
  };
  const lintTaggedTemplate = (
    template: ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression,
  ): void => {
    const start = source.getLineAndCharacterOfPosition(
      template.getStart(source) + 1,
    );
    let cssText = '';
    if (ts.isNoSubstitutionTemplateLiteral(template)) {
      cssText = template.text;
    } else {
      cssText = template.head.text;
      for (const span of template.templateSpans) {
        const interpolationRaw = source.text.slice(
          span.expression.pos - 2,
          span.literal.pos + 1,
        );
        cssText += buildInterpolationPlaceholder(interpolationRaw);
        cssText += span.literal.text;
      }
    }
    const tempMessages: LintMessage[] = [];
    const decls = parseCSS(cssText, tempMessages);
    for (const decl of decls) {
      const line = start.line + decl.line - 1;
      const column =
        decl.line === 1 ? start.character + decl.column - 1 : decl.column;
      const normalizedDecl = { ...decl, line, column };
      collectDeclarationTokenReferences(
        normalizedDecl,
        tokenReferences,
        'ts-template',
      );
      dispatchCSSDeclarationListener(dispatchContext, normalizedDecl);
    }
    for (const m of tempMessages) {
      const line = start.line + m.line - 1;
      const column = m.line === 1 ? start.character + m.column - 1 : m.column;
      messages.push({ ...m, line, column });
    }
  };
  const visit = (node: ts.Node) => {
    const nodeStart = node.getStart(source);
    const shouldSkipNode = skippedNodeRanges.some(
      (range) => nodeStart >= range.start && node.getEnd() <= range.end,
    );
    if (shouldSkipNode) {
      return;
    }
    collectTsTokenReferences(node, source, tokenReferences);
    dispatchNodeListener(dispatchContext, node, source);
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText() === 'style' &&
      node.initializer
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        const init = node.initializer;
        const start = source.getLineAndCharacterOfPosition(
          init.getStart(source) + 1,
        );
        const tempMessages: LintMessage[] = [];
        const decls = parseCSS(init.text, tempMessages);
        for (const decl of decls) {
          const line = start.line + decl.line - 1;
          const column =
            decl.line === 1 ? start.character + decl.column - 1 : decl.column;
          const normalizedDecl = { ...decl, line, column };
          collectDeclarationTokenReferences(
            normalizedDecl,
            tokenReferences,
            'tsx',
          );
          dispatchCSSDeclarationListener(dispatchContext, normalizedDecl);
        }
        for (const m of tempMessages) {
          const line = start.line + m.line - 1;
          const column =
            m.line === 1 ? start.character + m.column - 1 : m.column;
          messages.push({ ...m, line, column });
        }
        return;
      }
      if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        const expression = unwrapStyleExpression(node.initializer.expression);
        if (!ts.isObjectLiteralExpression(expression)) {
          // Non-support: non-object JSX style expressions are not converted into
          // CSS declarations in this parser path.
          ts.forEachChild(node, visit);
          return;
        }
        const styleObject = expression;
        const { declarations, consumedValueRanges } =
          extractJSXStyleDeclarations(styleObject);
        for (const declaration of declarations) {
          collectDeclarationTokenReferences(
            declaration,
            tokenReferences,
            'tsx:style-object',
          );
          dispatchCSSDeclarationListener(dispatchContext, declaration);
        }
        skippedNodeRanges.push(...consumedValueRanges);
        ts.forEachChild(node, visit);
        return;
      }
    } else if (ts.isTaggedTemplateExpression(node)) {
      const root = getRootTag(node.tag);
      if (
        root &&
        allowedTemplateTags.has(root) &&
        (ts.isNoSubstitutionTemplateLiteral(node.template) ||
          ts.isTemplateExpression(node.template))
      ) {
        lintTaggedTemplate(node.template);
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { tokenReferences };
}
