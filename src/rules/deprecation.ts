import ts from 'typescript';
import type { RuleModule } from '../core/types.js';

export const deprecationRule: RuleModule = {
  name: 'design-system/deprecation',
  meta: { description: 'flag deprecated tokens or components' },
  create(context) {
    const deprecations = context.tokens?.deprecations;
    if (!deprecations || Object.keys(deprecations).length === 0) {
      context.report({
        message:
          'design-system/deprecation requires deprecation tokens; configure tokens.deprecations to enable this rule.',
        line: 1,
        column: 1,
      });
      return {};
    }
    const names = new Set(Object.keys(deprecations));
    return {
      onNode(node) {
        if (ts.isStringLiteral(node) && names.has(node.text)) {
          const repl = deprecations[node.text].replacement;
          const pos = node
            .getSourceFile()
            .getLineAndCharacterOfPosition(node.getStart());
          context.report({
            message: `Token ${node.text} is deprecated${repl ? `, use ${repl}` : ''}`,
            line: pos.line + 1,
            column: pos.character + 1,
            fix: repl
              ? { range: [node.getStart(), node.getEnd()], text: `'${repl}'` }
              : undefined,
          });
        }
        if (
          ts.isJsxOpeningElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxClosingElement(node)
        ) {
          const tag = node.tagName.getText();
          if (names.has(tag)) {
            const repl = deprecations[tag].replacement;
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.getStart());
            context.report({
              message: `Component ${tag} is deprecated${repl ? `, use ${repl}` : ''}`,
              line: pos.line + 1,
              column: pos.character + 1,
              fix: repl
                ? {
                    range: [node.tagName.getStart(), node.tagName.getEnd()],
                    text: repl,
                  }
                : undefined,
            });
          }
        }
      },
      onCSSDeclaration(decl) {
        if (names.has(decl.value)) {
          const repl = deprecations[decl.value].replacement;
          context.report({
            message: `Token ${decl.value} is deprecated${repl ? `, use ${repl}` : ''}`,
            line: decl.line,
            column: decl.column,
          });
        }
      },
    };
  },
};
