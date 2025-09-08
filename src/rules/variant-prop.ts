import ts from 'typescript';
import type { RuleModule } from '../engine/types.js';

interface VariantPropOptions {
  components?: Record<string, string[] | undefined>;
  prop?: string;
}

export const variantPropRule: RuleModule<VariantPropOptions> = {
  name: 'design-system/variant-prop',
  meta: {
    description:
      'ensure specified components use allowed values for their variant prop',
  },
  create(context) {
    const { components = {}, prop: propName = 'variant' } =
      context.options ?? {};
    return {
      onNode(node) {
        if (!ts.isJsxOpeningLikeElement(node)) return;
        const tag = node.tagName.getText();
        const allowed = components[tag];
        if (!allowed) return;
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue;
          if (attr.name.getText() !== propName) continue;
          if (!attr.initializer) continue;
          let value: string | null = null;
          const init = attr.initializer;
          if (
            ts.isStringLiteral(init) ||
            ts.isNoSubstitutionTemplateLiteral(init)
          ) {
            value = init.text;
          } else if (
            ts.isJsxExpression(init) &&
            init.expression &&
            (ts.isStringLiteral(init.expression) ||
              ts.isNoSubstitutionTemplateLiteral(init.expression))
          ) {
            value = init.expression.text;
          }
          if (value && !allowed.includes(value)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(attr.getStart());
            context.report({
              message: `Unexpected ${propName} "${value}" for ${tag}; allowed: ${allowed.join(', ')}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
    };
  },
};
