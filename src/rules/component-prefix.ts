import ts from 'typescript';
import { z } from 'zod';
import type { RuleModule } from '../core/types.js';

interface ComponentPrefixOptions {
  prefix?: string;
  packages?: string[];
  components?: string[];
}

interface ScopedImportSource {
  moduleName: string;
  importedName: string;
}

interface ImportMapEntry {
  moduleName: string;
  importedName: string;
  isNamespace: boolean;
}

function getJsxTagName(node: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(node)) {
    return node.text;
  }

  if (
    node.kind === ts.SyntaxKind.PropertyAccessExpression ||
    node.kind === ts.SyntaxKind.JsxNamespacedName
  ) {
    return node.getText();
  }

  return 'this';
}

function isSimpleFixableTagName(
  node: ts.JsxTagNameExpression,
): node is ts.Identifier {
  return ts.isIdentifier(node);
}

function getRequiredPrefix(tag: string, prefix: string): string {
  if (!tag.includes('-')) {
    return prefix;
  }

  return prefix.endsWith('-') ? prefix : `${prefix}-`;
}

function getImportedComponentName(
  node: ts.JsxTagNameExpression,
  importSource: ScopedImportSource,
): string {
  if (ts.isPropertyAccessExpression(node) || ts.isJsxNamespacedName(node)) {
    return node.name.text;
  }

  return importSource.importedName;
}

function getImportDeclarationFromImportSpecifier(
  declaration: ts.ImportSpecifier,
): ts.ImportDeclaration | null {
  const namedImports = declaration.parent;
  if (!ts.isNamedImports(namedImports)) {
    return null;
  }

  const importClause = namedImports.parent;
  if (!ts.isImportClause(importClause)) {
    return null;
  }

  const importDeclaration = importClause.parent;
  return ts.isImportDeclaration(importDeclaration) ? importDeclaration : null;
}

function getImportDeclarationFromNamespaceImport(
  declaration: ts.NamespaceImport,
): ts.ImportDeclaration | null {
  const importClause = declaration.parent;
  if (!ts.isImportClause(importClause)) {
    return null;
  }

  const importDeclaration = importClause.parent;
  return ts.isImportDeclaration(importDeclaration) ? importDeclaration : null;
}

function parseImportSourceFromDeclaration(
  declaration: ts.Declaration,
): ScopedImportSource | null {
  if (ts.isImportSpecifier(declaration)) {
    const importDeclaration =
      getImportDeclarationFromImportSpecifier(declaration);
    if (!importDeclaration) {
      return null;
    }

    if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) {
      return null;
    }

    return {
      moduleName: importDeclaration.moduleSpecifier.text,
      importedName: declaration.propertyName?.text ?? declaration.name.text,
    };
  }

  if (ts.isImportClause(declaration)) {
    const importDeclaration = declaration.parent;
    if (!ts.isImportDeclaration(importDeclaration)) {
      return null;
    }

    if (!declaration.name) {
      return null;
    }

    if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) {
      return null;
    }

    return {
      moduleName: importDeclaration.moduleSpecifier.text,
      importedName: declaration.name.text,
    };
  }

  if (ts.isNamespaceImport(declaration)) {
    const importDeclaration =
      getImportDeclarationFromNamespaceImport(declaration);
    if (!importDeclaration) {
      return null;
    }

    if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) {
      return null;
    }

    return {
      moduleName: importDeclaration.moduleSpecifier.text,
      importedName: declaration.name.text,
    };
  }

  return null;
}

export const componentPrefixRule: RuleModule<ComponentPrefixOptions> = {
  name: 'design-system/component-prefix',
  meta: {
    description: 'enforce a prefix for design system components',
    category: 'component',
    schema: z
      .object({
        prefix: z.string().optional(),
        packages: z.array(z.string()).optional(),
        components: z.array(z.string()).optional(),
      })
      .optional(),
  },
  create(context) {
    const prefix = context.options?.prefix ?? 'DS';
    const scopedPackages = new Set(context.options?.packages ?? []);
    const scopedComponents = new Set(context.options?.components ?? []);
    const hasScopedSources =
      scopedPackages.size > 0 || scopedComponents.size > 0;
    const importMapBySourceFile = new Map<
      ts.SourceFile,
      Map<string, ImportMapEntry>
    >();

    const getImportMap = (
      sourceFile: ts.SourceFile,
    ): Map<string, ImportMapEntry> => {
      let importMap = importMapBySourceFile.get(sourceFile);
      if (!importMap) {
        importMap = new Map<string, ImportMapEntry>();
        importMapBySourceFile.set(sourceFile, importMap);
      }

      return importMap;
    };

    const collectImportMapEntry = (node: ts.ImportDeclaration): void => {
      if (!ts.isStringLiteral(node.moduleSpecifier)) {
        return;
      }

      const importClause = node.importClause;
      if (!importClause) {
        return;
      }

      const importMap = getImportMap(node.getSourceFile());
      const moduleName = node.moduleSpecifier.text;

      if (importClause.name) {
        importMap.set(importClause.name.text, {
          moduleName,
          importedName: importClause.name.text,
          isNamespace: false,
        });
      }

      if (!importClause.namedBindings) {
        return;
      }

      if (ts.isNamedImports(importClause.namedBindings)) {
        for (const specifier of importClause.namedBindings.elements) {
          importMap.set(specifier.name.text, {
            moduleName,
            importedName: specifier.propertyName?.text ?? specifier.name.text,
            isNamespace: false,
          });
        }
      }

      if (ts.isNamespaceImport(importClause.namedBindings)) {
        importMap.set(importClause.namedBindings.name.text, {
          moduleName,
          importedName: importClause.namedBindings.name.text,
          isNamespace: true,
        });
      }
    };

    const resolveImportSourceFromMap = (
      tagNode: ts.JsxTagNameExpression,
    ): ScopedImportSource | null => {
      const importMap = getImportMap(tagNode.getSourceFile());

      if (ts.isIdentifier(tagNode)) {
        const entry = importMap.get(tagNode.text);
        if (!entry) {
          return null;
        }

        return {
          moduleName: entry.moduleName,
          importedName: entry.importedName,
        };
      }

      if (ts.isPropertyAccessExpression(tagNode)) {
        const namespaceEntry = importMap.get(tagNode.expression.getText());
        if (namespaceEntry?.isNamespace !== true) {
          return null;
        }

        return {
          moduleName: namespaceEntry.moduleName,
          importedName: tagNode.name.text,
        };
      }

      if (ts.isJsxNamespacedName(tagNode)) {
        const namespaceEntry = importMap.get(tagNode.namespace.text);
        if (namespaceEntry?.isNamespace !== true) {
          return null;
        }

        return {
          moduleName: namespaceEntry.moduleName,
          importedName: tagNode.name.text,
        };
      }

      return null;
    };

    const resolveImportSource = (
      tagNode: ts.JsxTagNameExpression,
    ): ScopedImportSource | null => {
      const symbol = context.symbolResolution?.resolveSymbol(tagNode);
      const sourceDeclaration = symbol?.declarations?.find(
        (declaration): declaration is ts.Declaration =>
          ts.isImportSpecifier(declaration) ||
          ts.isImportClause(declaration) ||
          ts.isNamespaceImport(declaration),
      );
      if (sourceDeclaration) {
        const fromDeclaration =
          parseImportSourceFromDeclaration(sourceDeclaration);
        if (fromDeclaration) {
          return fromDeclaration;
        }
      }

      return resolveImportSourceFromMap(tagNode);
    };

    const isDesignSystemComponent = (
      tagNode: ts.JsxTagNameExpression,
    ): boolean => {
      if (!hasScopedSources) {
        return true;
      }

      const importSource = resolveImportSource(tagNode);
      if (!importSource) {
        return false;
      }

      if (
        scopedPackages.size > 0 &&
        !scopedPackages.has(importSource.moduleName)
      ) {
        return false;
      }

      const componentName = getImportedComponentName(tagNode, importSource);
      if (scopedComponents.size > 0 && !scopedComponents.has(componentName)) {
        return false;
      }

      return true;
    };

    return {
      onNode(node) {
        if (ts.isImportDeclaration(node)) {
          collectImportMapEntry(node);
          return;
        }

        if (
          ts.isJsxOpeningElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxClosingElement(node)
        ) {
          const tag = getJsxTagName(node.tagName);
          if (!tag) return;

          const isCustomElement = tag.includes('-');
          const isPascalCaseComponent = /^[A-Z]/.test(tag);
          const isComplexTagName =
            node.tagName.kind === ts.SyntaxKind.PropertyAccessExpression ||
            node.tagName.kind === ts.SyntaxKind.JsxNamespacedName ||
            node.tagName.kind === ts.SyntaxKind.ThisKeyword;
          const isComponent =
            isPascalCaseComponent || isCustomElement || isComplexTagName;
          if (!isComponent) return;
          if (!isDesignSystemComponent(node.tagName)) return;

          const requiredPrefix = getRequiredPrefix(tag, prefix);

          if (!tag.startsWith(requiredPrefix)) {
            const pos = node
              .getSourceFile()
              .getLineAndCharacterOfPosition(node.tagName.getStart());
            context.report({
              message: `Component "${tag}" should be prefixed with "${requiredPrefix}"`,
              line: pos.line + 1,
              column: pos.character + 1,
              fix: isSimpleFixableTagName(node.tagName)
                ? {
                    range: [node.tagName.getStart(), node.tagName.getEnd()],
                    text: `${requiredPrefix}${tag}`,
                  }
                : undefined,
            });
          }
        }
      },
    };
  },
};
