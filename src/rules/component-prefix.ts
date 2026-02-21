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

function resolveImportSourceFromTag(
  tagNode: ts.JsxTagNameExpression,
  symbolResolution?: {
    getSymbolAtLocation: (node: ts.Node) => ts.Symbol | undefined;
    resolveSymbol: (node: ts.Node) => ts.Symbol | undefined;
  },
): ScopedImportSource | null {
  if (!symbolResolution) {
    return null;
  }

  const candidates = [
    symbolResolution.getSymbolAtLocation(tagNode),
    symbolResolution.resolveSymbol(tagNode),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const sourceDeclaration = candidate.declarations?.find(
      (declaration): declaration is ts.Declaration =>
        ts.isImportSpecifier(declaration) ||
        ts.isImportClause(declaration) ||
        ts.isNamespaceImport(declaration),
    );
    if (!sourceDeclaration) {
      continue;
    }

    const importSource = parseImportSourceFromDeclaration(sourceDeclaration);
    if (importSource) {
      return importSource;
    }
  }

  return null;
}

function createFallbackImportLookup(
  sourceFile: ts.SourceFile,
): Map<string, string> {
  const imports = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const moduleName = statement.moduleSpecifier.text;
    const importClause = statement.importClause;
    if (!importClause) {
      continue;
    }

    if (importClause.name) {
      imports.set(importClause.name.text, moduleName);
    }

    const namedBindings = importClause.namedBindings;
    if (!namedBindings) {
      continue;
    }

    if (ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        imports.set(element.name.text, moduleName);
      }
      continue;
    }

    if (ts.isNamespaceImport(namedBindings)) {
      imports.set(namedBindings.name.text, moduleName);
    }
  }

  return imports;
}

function resolveFallbackImportSource(
  tagNode: ts.JsxTagNameExpression,
  sourceFile: ts.SourceFile,
): ScopedImportSource | null {
  const imports = createFallbackImportLookup(sourceFile);

  if (ts.isIdentifier(tagNode)) {
    const moduleName = imports.get(tagNode.text);
    if (!moduleName) {
      return null;
    }

    return {
      moduleName,
      importedName: tagNode.text,
    };
  }

  if (ts.isPropertyAccessExpression(tagNode)) {
    const root = tagNode.expression;
    if (!ts.isIdentifier(root)) {
      return null;
    }

    const moduleName = imports.get(root.text);
    if (!moduleName) {
      return null;
    }

    return {
      moduleName,
      importedName: tagNode.name.text,
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

    const isDesignSystemComponent = (
      tagNode: ts.JsxTagNameExpression,
    ): boolean => {
      if (!hasScopedSources) {
        return true;
      }

      const importSource =
        resolveImportSourceFromTag(tagNode, context.symbolResolution) ??
        resolveFallbackImportSource(tagNode, tagNode.getSourceFile());
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
