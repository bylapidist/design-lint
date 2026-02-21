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
  const { descriptor } = parse(text, { filename: sourceId });
  const template = descriptor.template?.content ?? '';
  collectTextTokenReferences(tokenReferences, template, 1, 1, 'vue:template');
  const templateTsx = template
    .replace(/class=/g, 'className=')
    .replace(
      /:style="{([^}]+)}"/g,
      (_: string, expr: string) => `style={{ ${expr.trim()} }}`,
    );
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
