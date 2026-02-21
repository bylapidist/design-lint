import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const ROOT_EXPORTS_FILE = path.resolve('src/index.ts');
const CORE_EXPORTS_FILE = path.resolve('src/core/index.ts');
const PLUGINS_DOC_FILE = path.resolve('docs/plugins.md');

function resolveExportPath(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }
  const absolute = path.resolve(path.dirname(fromFile), specifier);
  const withTsExtension = absolute.replace(/\.js$/, '.ts');
  return withTsExtension;
}

async function collectNamedExports(
  filePath: string,
  seen = new Set<string>(),
): Promise<Set<string>> {
  if (seen.has(filePath)) {
    return new Set<string>();
  }
  seen.add(filePath);

  const sourceText = await readFile(filePath, 'utf8');
  const source = ts.createSourceFile(
    'module.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const namedExports = new Set<string>();

  function visit(node: ts.Node): void {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          namedExports.add(element.name.text);
        }
      }

      return;
    }

    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined;
    const isExported = modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );

    if (!isExported) {
      ts.forEachChild(node, visit);
      return;
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      namedExports.add(node.name.text);
      return;
    }

    if (ts.isClassDeclaration(node) && node.name) {
      namedExports.add(node.name.text);
      return;
    }

    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      namedExports.add(node.name.text);
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          namedExports.add(declaration.name.text);
        }
      }
      return;
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(source, visit);

  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    if (statement.exportClause) continue;
    if (!statement.moduleSpecifier) continue;

    const specifier = statement.moduleSpecifier.getText(source).slice(1, -1);
    const exportFilePath = resolveExportPath(filePath, specifier);
    if (!exportFilePath) continue;
    const nestedExports = await collectNamedExports(exportFilePath, seen);
    for (const exportedName of nestedExports) {
      namedExports.add(exportedName);
    }
  }

  return namedExports;
}

function extractImportsFromSnippet(
  snippet: string,
): { source: string; names: string[] }[] {
  const source = ts.createSourceFile(
    'snippet.ts',
    snippet,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports: { source: string; names: string[] }[] = [];

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!statement.importClause?.namedBindings) continue;
    if (!ts.isNamedImports(statement.importClause.namedBindings)) continue;

    const moduleName = statement.moduleSpecifier.getText(source).slice(1, -1);
    const names = statement.importClause.namedBindings.elements.map(
      (element) => element.propertyName?.text ?? element.name.text,
    );

    imports.push({ source: moduleName, names });
  }

  return imports;
}

void test('docs/plugins.md references exported linter APIs', async () => {
  const [rootExports, coreExports, pluginsDocText] = await Promise.all([
    collectNamedExports(ROOT_EXPORTS_FILE),
    collectNamedExports(CORE_EXPORTS_FILE),
    readFile(PLUGINS_DOC_FILE, 'utf8'),
  ]);

  const tsCodeBlocks = Array.from(
    pluginsDocText.matchAll(/```ts\n([\s\S]*?)```/g),
    (match) => match[1],
  );

  const missingRoot: string[] = [];
  const missingCore: string[] = [];

  for (const block of tsCodeBlocks) {
    for (const importStatement of extractImportsFromSnippet(block)) {
      if (importStatement.source === '@lapidist/design-lint') {
        for (const importedName of importStatement.names) {
          if (!rootExports.has(importedName)) {
            missingRoot.push(importedName);
          }
        }
      }
      if (importStatement.source === '@lapidist/design-lint/core') {
        for (const importedName of importStatement.names) {
          if (!coreExports.has(importedName)) {
            missingCore.push(importedName);
          }
        }
      }
    }
  }

  assert.deepEqual(
    Array.from(new Set(missingRoot)).sort(),
    [],
    'docs/plugins.md imports non-exported symbols from @lapidist/design-lint',
  );
  assert.deepEqual(
    Array.from(new Set(missingCore)).sort(),
    [],
    'docs/plugins.md imports non-exported symbols from @lapidist/design-lint/core',
  );
});
