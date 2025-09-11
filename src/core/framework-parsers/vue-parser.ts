import ts from 'typescript';
import { parseCSS } from './css-parser.js';
import type { RuleModule, LintMessage } from '../types.js';

export async function lintVue(
  text: string,
  sourceId: string,
  listeners: ReturnType<RuleModule['create']>[],
  messages: LintMessage[],
): Promise<void> {
  const { parse } = await import('@vue/compiler-sfc');
  const { descriptor } = parse(text, { filename: sourceId });
  const template = descriptor.template?.content ?? '';
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
      for (const l of listeners) l.onNode?.(node);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const style of descriptor.styles) {
    const lang = typeof style.lang === 'string' ? style.lang : undefined;
    const decls = parseCSS(style.content, messages, lang);
    for (const decl of decls) {
      for (const l of listeners) l.onCSSDeclaration?.(decl);
    }
  }
}
