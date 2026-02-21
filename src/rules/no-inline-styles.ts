import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

interface NoInlineStylesOptions {
  /** When true, the rule will ignore class/className attributes. */
  ignoreClassName?: boolean;
  /** Explicit design system component names to target. */
  components?: string[];
  /** Package specifiers considered design-system import origins. */
  importOrigins?: string[];
}

export const noInlineStylesRule: RuleModule<NoInlineStylesOptions> = {
  name: 'design-system/no-inline-styles',
  meta: {
    description:
      'disallow inline style or className attributes on design system components',
    category: 'component',
    schema: z
      .object({
        ignoreClassName: z.boolean().optional(),
        components: z.array(z.string()).optional(),
        importOrigins: z.array(z.string()).optional(),
      })
      .optional(),
  },
  create(context) {
    const ignoreClassName = context.options?.ignoreClassName ?? false;
    const configuredComponents = new Set(context.options?.components ?? []);
    const configuredOrigins = new Set(context.options?.importOrigins ?? []);
    const importOriginsByFile = new Map<string, Map<string, string>>();

    const getFileImportMap = (sourceFile: ts.SourceFile): Map<string, string> => {
      const fileId = sourceFile.fileName;
      let fileImportMap = importOriginsByFile.get(fileId);
      if (!fileImportMap) {
        fileImportMap = new Map<string, string>();
        importOriginsByFile.set(fileId, fileImportMap);
      }
      return fileImportMap;
    };

    const collectImportDeclaration = (declaration: ts.ImportDeclaration): void => {
      if (!ts.isStringLiteral(declaration.moduleSpecifier)) return;
      const importClause = declaration.importClause;
      if (!importClause) return;

      const moduleSpecifier = declaration.moduleSpecifier.text;
      const fileImportMap = getFileImportMap(declaration.getSourceFile());

      if (importClause.name) {
        fileImportMap.set(importClause.name.text, moduleSpecifier);
      }

      const namedBindings = importClause.namedBindings;
      if (!namedBindings) return;

      if (ts.isNamespaceImport(namedBindings)) {
        fileImportMap.set(namedBindings.name.text, moduleSpecifier);
        return;
      }

      for (const element of namedBindings.elements) {
        fileImportMap.set(element.name.text, moduleSpecifier);
      }
    };

    const resolveImportOriginFromMap = (
      tagName: ts.JsxTagNameExpression,
    ): string => {
      const fileImportMap = importOriginsByFile.get(tagName.getSourceFile().fileName);
      if (!fileImportMap) return '';

      if (ts.isIdentifier(tagName)) {
        return fileImportMap.get(tagName.text) ?? '';
      }

      if (ts.isPropertyAccessExpression(tagName)) {
        const namespace = tagName.expression.getText();
        return fileImportMap.get(namespace) ?? fileImportMap.get(tagName.getText()) ?? '';
      }

      return fileImportMap.get(tagName.getText()) ?? '';
    };

    const resolveImportOrigin = (tagName: ts.JsxTagNameExpression): string => {
      const symbolAtLocation =
        context.symbolResolution?.getSymbolAtLocation(tagName);
      const symbol = context.symbolResolution?.resolveSymbol(tagName);
      if (symbolAtLocation || symbol) {
        const declarations = [
          ...(symbolAtLocation?.declarations ?? []),
          ...(symbol?.declarations ?? []),
        ];
        for (const declaration of declarations) {
          if (ts.isImportSpecifier(declaration)) {
            const parent = declaration.parent.parent.parent;
            if (ts.isImportDeclaration(parent)) {
              const moduleSpecifier = parent.moduleSpecifier;
              if (ts.isStringLiteral(moduleSpecifier))
                return moduleSpecifier.text;
            }
          }
          if (ts.isImportClause(declaration)) {
            const parent = declaration.parent;
            if (ts.isImportDeclaration(parent)) {
              const moduleSpecifier = parent.moduleSpecifier;
              if (ts.isStringLiteral(moduleSpecifier))
                return moduleSpecifier.text;
            }
          }
          if (ts.isNamespaceImport(declaration)) {
            const parent = declaration.parent.parent;
            if (ts.isImportDeclaration(parent)) {
              const moduleSpecifier = parent.moduleSpecifier;
              if (ts.isStringLiteral(moduleSpecifier))
                return moduleSpecifier.text;
            }
          }
        }
      }

      return resolveImportOriginFromMap(tagName);
    };

    const shouldCheckTag = (
      tag: string,
      tagName: ts.JsxTagNameExpression,
    ): boolean => {
      const symbolName =
        context.symbolResolution?.getSymbolName(tagName) ?? tag;
      if (
        configuredComponents.has(symbolName) ||
        configuredComponents.has(tag)
      ) {
        return true;
      }
      if (configuredOrigins.size > 0) {
        const importOrigin = resolveImportOrigin(tagName);
        if (importOrigin.length === 0) return false;
        return configuredOrigins.has(importOrigin);
      }
      return configuredComponents.size > 0;
    };

    return {
      onNode(node) {
        if (ts.isImportDeclaration(node)) {
          collectImportDeclaration(node);
          return;
        }
        if (!ts.isJsxOpeningLikeElement(node)) return;
        const tag = node.tagName.getText();
        const isCustomElement = tag.includes('-');
        const isComponent =
          tag.startsWith(tag[0].toUpperCase()) || isCustomElement;
        if (!isComponent) return;
        if (!shouldCheckTag(tag, node.tagName)) return;
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue;
          const name = attr.name.getText();
          if (name === 'style') {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(attr.getStart());
            context.report({
              message: `Unexpected style attribute on ${tag}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
            continue;
          }
          const isClassName = name === 'className' || name === 'class';
          if (!ignoreClassName && isClassName) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(attr.getStart());
            context.report({
              message: `Unexpected ${name} attribute on ${tag}`,
              line: pos.line + 1,
              column: pos.character + 1,
            });
          }
        }
      },
    };
  },
};
