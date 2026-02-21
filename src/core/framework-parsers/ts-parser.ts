import ts from 'typescript';
import { parseCSS } from './css-parser.js';
import type { RuleModule, LintMessage } from '../types.js';
import type { ParserPassResult } from '../parser-registry.js';
import {
  collectDeclarationTokenReferences,
  collectTsTokenReferences,
} from './token-references.js';

export function lintTS(
  text: string,
  sourceId: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
): ParserPassResult {
  const source = ts.createSourceFile(
    sourceId,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const tokenReferences: NonNullable<ParserPassResult['tokenReferences']> = [];
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
  const visit = (node: ts.Node) => {
    collectTsTokenReferences(node, source, tokenReferences);
    for (const l of listeners) l.onNode?.(node);
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText() === 'style' &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
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
        for (const l of listeners) l.onCSSDeclaration?.(normalizedDecl);
      }
      for (const m of tempMessages) {
        const line = start.line + m.line - 1;
        const column = m.line === 1 ? start.character + m.column - 1 : m.column;
        messages.push({ ...m, line, column });
      }
      return;
    } else if (ts.isTaggedTemplateExpression(node)) {
      const root = getRootTag(node.tag);
      if (
        root &&
        ['styled', 'css', 'tw'].includes(root) &&
        ts.isNoSubstitutionTemplateLiteral(node.template)
      ) {
        const tpl = node.template;
        const start = source.getLineAndCharacterOfPosition(
          tpl.getStart(source) + 1,
        );
        const tempMessages: LintMessage[] = [];
        const decls = parseCSS(tpl.text, tempMessages);
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
          for (const l of listeners) l.onCSSDeclaration?.(normalizedDecl);
        }
        for (const m of tempMessages) {
          const line = start.line + m.line - 1;
          const column =
            m.line === 1 ? start.character + m.column - 1 : m.column;
          messages.push({ ...m, line, column });
        }
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { tokenReferences };
}
