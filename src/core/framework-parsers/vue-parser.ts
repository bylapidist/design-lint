import ts from 'typescript';
import { parseCSS } from './css-parser.js';
import type { LintMessage, RegisteredRuleListener } from '../types.js';
import type { ParserPassResult } from '../parser-registry.js';
import {
  collectDeclarationTokenReferences,
  collectTextTokenReferences,
  collectTsTokenReferences,
} from './token-references.js';
import {
  dispatchCSSDeclarationListener,
  dispatchNodeListener,
} from './listener-dispatch.js';

interface LineStartMap {
  starts: number[];
}

interface CssDeclarationCandidate {
  prop: string;
  value: string;
  line: number;
  column: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createLineStartMap(text: string): LineStartMap {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') starts.push(index + 1);
  }
  return { starts };
}

function getLineAndColumnAtOffset(
  lineMap: LineStartMap,
  offset: number,
): { line: number; column: number } {
  let low = 0;
  let high = lineMap.starts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineMap.starts[mid];
    const nextLineStart = lineMap.starts[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (offset < lineStart) {
      high = mid - 1;
    } else if (offset >= nextLineStart) {
      low = mid + 1;
    } else {
      return { line: mid + 1, column: offset - lineStart + 1 };
    }
  }
  return { line: 1, column: 1 };
}

function extractInlineStyleDeclarations(
  value: string,
  startOffset: number,
  lineMap: LineStartMap,
): CssDeclarationCandidate[] {
  const declarations: CssDeclarationCandidate[] = [];
  const pattern = /([^:;]+?)\s*:\s*([^;]+?)(?:;|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    const prop = match[1].trim();
    const declarationValue = match[2].trim();
    if (!prop || !declarationValue) continue;
    const location = getLineAndColumnAtOffset(
      lineMap,
      startOffset + match.index,
    );
    declarations.push({
      prop,
      value: declarationValue,
      line: location.line,
      column: location.column,
    });
  }
  return declarations;
}

function extractStyleValueText(node: ts.Expression): string {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return node.getText();
}

function extractStyleDeclarationsFromExpression(
  expression: string,
  expressionOffset: number,
  lineMap: LineStartMap,
): CssDeclarationCandidate[] {
  const wrappedExpression = `(${expression});`;
  const source = ts.createSourceFile(
    'vue-style-expression.ts',
    wrappedExpression,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declarations: CssDeclarationCandidate[] = [];

  const visitExpression = (node: ts.Expression): void => {
    if (ts.isParenthesizedExpression(node)) {
      visitExpression(node.expression);
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        if (ts.isExpression(element)) visitExpression(element);
      }
      return;
    }
    if (ts.isConditionalExpression(node)) {
      visitExpression(node.whenTrue);
      visitExpression(node.whenFalse);
      return;
    }
    if (!ts.isObjectLiteralExpression(node)) return;

    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const nameNode = property.name;
      const name =
        ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)
          ? nameNode.text
          : undefined;
      if (!name) continue;
      const valueNode = property.initializer;
      const location = getLineAndColumnAtOffset(
        lineMap,
        expressionOffset + valueNode.getStart(source) - 1,
      );
      declarations.push({
        prop: name,
        value: extractStyleValueText(valueNode),
        line: location.line,
        column: location.column,
      });
    }
  };

  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement)) continue;
    visitExpression(statement.expression);
  }

  return declarations;
}

function collectTemplateStyleBindingReferences(
  fullText: string,
  templateContent: string,
  templateStartOffset: number,
  parseTemplate: (template: string) => { children?: unknown[] },
): CssDeclarationCandidate[] {
  if (!templateContent.trim()) return [];

  const lineMap = createLineStartMap(fullText);
  const ast = parseTemplate(templateContent);
  const declarations: CssDeclarationCandidate[] = [];

  const walk = (node: unknown): void => {
    if (!isRecord(node)) return;

    const props = Array.isArray(node.props) ? node.props : [];
    for (const prop of props) {
      if (!isRecord(prop)) continue;

      if (prop.type === 6 && prop.name === 'style') {
        const valueNode = isRecord(prop.value) ? prop.value : null;
        if (!valueNode || typeof valueNode.content !== 'string') continue;
        const offset =
          isRecord(valueNode.loc) &&
          isRecord(valueNode.loc.start) &&
          typeof valueNode.loc.start.offset === 'number'
            ? valueNode.loc.start.offset
            : 0;
        declarations.push(
          ...extractInlineStyleDeclarations(
            valueNode.content,
            templateStartOffset + offset,
            lineMap,
          ),
        );
        continue;
      }

      if (prop.type !== 7 || prop.name !== 'bind') continue;
      if (
        !isRecord(prop.arg) ||
        prop.arg.type !== 4 ||
        prop.arg.isStatic !== true
      )
        continue;
      if (prop.arg.content !== 'style') continue;
      if (!isRecord(prop.exp) || prop.exp.type !== 4) continue;
      if (typeof prop.exp.content !== 'string' || !prop.exp.content.trim())
        continue;
      const expressionOffset =
        isRecord(prop.exp.loc) &&
        isRecord(prop.exp.loc.start) &&
        typeof prop.exp.loc.start.offset === 'number'
          ? prop.exp.loc.start.offset
          : 0;
      declarations.push(
        ...extractStyleDeclarationsFromExpression(
          prop.exp.content,
          templateStartOffset + expressionOffset,
          lineMap,
        ),
      );
    }

    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) walk(child);
    const branches = Array.isArray(node.branches) ? node.branches : [];
    for (const branch of branches) walk(branch);
  };

  for (const child of ast.children ?? []) walk(child);
  return declarations;
}

function buildVueTemplateTsx(
  templateContent: string,
  parseTemplate: (template: string) => { children?: unknown[] },
): string {
  if (!templateContent.trim()) return templateContent;
  const ast = parseTemplate(templateContent);
  const replacements: { start: number; end: number; text: string }[] = [];

  const walk = (node: unknown): void => {
    if (!isRecord(node)) return;
    const props = Array.isArray(node.props) ? node.props : [];
    for (const prop of props) {
      if (
        !isRecord(prop) ||
        !isRecord(prop.loc) ||
        !isRecord(prop.loc.start) ||
        !isRecord(prop.loc.end)
      )
        continue;
      if (
        typeof prop.loc.start.offset !== 'number' ||
        typeof prop.loc.end.offset !== 'number'
      )
        continue;
      if (prop.type === 6 && prop.name === 'class') {
        replacements.push({
          start: prop.loc.start.offset,
          end: prop.loc.start.offset + 5,
          text: 'className',
        });
        continue;
      }
      if (prop.type !== 7) continue;
      if (
        !isRecord(prop.arg) ||
        prop.arg.type !== 4 ||
        prop.arg.isStatic !== true ||
        typeof prop.arg.content !== 'string'
      ) {
        replacements.push({
          start: prop.loc.start.offset,
          end: prop.loc.end.offset,
          text: 'data-v-directive=""',
        });
        continue;
      }
      const attrName = prop.arg.content;
      if (!attrName) continue;
      if (
        isRecord(prop.exp) &&
        prop.exp.type === 4 &&
        typeof prop.exp.content === 'string' &&
        prop.exp.content.trim()
      ) {
        replacements.push({
          start: prop.loc.start.offset,
          end: prop.loc.end.offset,
          text: `${attrName}={${prop.exp.content}}`,
        });
        continue;
      }
      replacements.push({
        start: prop.loc.start.offset,
        end: prop.loc.end.offset,
        text: attrName,
      });
    }
    const children = Array.isArray(node.children) ? node.children : [];
    const branches = Array.isArray(node.branches) ? node.branches : [];
    for (const child of children) walk(child);
    for (const branch of branches) walk(branch);
  };

  for (const child of ast.children ?? []) walk(child);
  let output = templateContent;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output =
      output.slice(0, replacement.start) +
      replacement.text +
      output.slice(replacement.end);
  }
  return output;
}
export async function lintVue(
  text: string,
  sourceId: string,
  listeners: RegisteredRuleListener[],
  messages: LintMessage[],
): Promise<ParserPassResult> {
  const tokenReferences: NonNullable<ParserPassResult['tokenReferences']> = [];
  const dispatchContext = {
    listeners,
    messages,
    sourceId,
    failedHooks: new Set<string>(),
  };
  const { parse } = await import('@vue/compiler-sfc');
  const { parse: parseTemplate } = await import('@vue/compiler-dom');
  const { descriptor } = parse(text, { filename: sourceId });
  const template = descriptor.template?.content ?? '';
  collectTextTokenReferences(tokenReferences, template, 1, 1, 'vue:template');
  const templateDeclarations = collectTemplateStyleBindingReferences(
    text,
    template,
    descriptor.template?.loc.start.offset ?? 0,
    parseTemplate,
  );
  for (const declaration of templateDeclarations) {
    collectDeclarationTokenReferences(
      declaration,
      tokenReferences,
      'vue:template-style',
    );
    dispatchCSSDeclarationListener(dispatchContext, declaration);
  }

  const templateTsx = buildVueTemplateTsx(template, parseTemplate);
  const scripts: string[] = [];
  if (descriptor.script?.content) scripts.push(descriptor.script.content);
  if (descriptor.scriptSetup?.content)
    scripts.push(descriptor.scriptSetup.content);
  const scriptBlocks = scripts.length ? scripts : [''];
  for (const scriptContent of scriptBlocks) {
    const combined = `${scriptContent}\nfunction __render(){ return (${templateTsx}); }`;
    const source = ts.createSourceFile(
      sourceId,
      combined,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      collectTsTokenReferences(node, source, tokenReferences, 'vue:ts');
      dispatchNodeListener(dispatchContext, node, source);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const style of descriptor.styles) {
    const lang = typeof style.lang === 'string' ? style.lang : undefined;
    const decls = parseCSS(style.content, messages, lang);
    for (const decl of decls) {
      collectDeclarationTokenReferences(decl, tokenReferences, 'vue:style');
      dispatchCSSDeclarationListener(dispatchContext, decl);
    }
  }
  return { tokenReferences };
}
