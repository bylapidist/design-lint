import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const PACKAGE_FILE = path.resolve('package.json');
const ROOT_EXPORTS_FILE = path.resolve('src/index.ts');
const USAGE_DOC_FILE = path.resolve('docs/usage.md');

interface PackageExportTarget {
  readonly types: string;
  readonly default: string;
}

interface PackageManifest {
  readonly exports: Record<string, PackageExportTarget>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toPackageManifest(value: unknown): PackageManifest {
  if (!isRecord(value)) {
    throw new Error('package.json must contain an object at the root.');
  }

  const exportsValue = value.exports;
  if (!isRecord(exportsValue)) {
    throw new Error('package.json must define an exports object.');
  }

  const exports: Record<string, PackageExportTarget> = {};
  for (const [key, entry] of Object.entries(exportsValue)) {
    if (!isRecord(entry)) {
      continue;
    }

    const types = entry.types;
    const defaultEntry = entry.default;
    if (typeof types !== 'string' || typeof defaultEntry !== 'string') {
      continue;
    }

    exports[key] = { types, default: defaultEntry };
  }

  return { exports };
}

function resolveExportPath(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const absolute = path.resolve(path.dirname(fromFile), specifier);
  return absolute.replace(/\.js$/, '.ts');
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
    filePath,
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

void test('docs/usage.md imports output helpers from the root package export', async () => {
  const [packageText, usageDocText, rootExports] = await Promise.all([
    readFile(PACKAGE_FILE, 'utf8'),
    readFile(USAGE_DOC_FILE, 'utf8'),
    collectNamedExports(ROOT_EXPORTS_FILE),
  ]);

  const packageJson = toPackageManifest(JSON.parse(packageText));
  assert.deepEqual(packageJson.exports['.'], {
    types: './dist/index.d.ts',
    default: './dist/index.js',
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(packageJson.exports, './output'),
    false,
  );

  const tsCodeBlocks = Array.from(
    usageDocText.matchAll(/```ts\n([\s\S]*?)```/g),
    (match) => match[1],
  );

  const documentedImports = tsCodeBlocks.flatMap((block) => {
    const snippet = ts.createSourceFile(
      'usage-snippet.ts',
      block,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const imports: { source: string; names: string[] }[] = [];

    for (const statement of snippet.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!statement.importClause?.namedBindings) continue;
      if (!ts.isNamedImports(statement.importClause.namedBindings)) continue;

      const source = statement.moduleSpecifier.getText(snippet).slice(1, -1);
      const names = statement.importClause.namedBindings.elements.map(
        (element) => element.propertyName?.text ?? element.name.text,
      );
      imports.push({ source, names });
    }

    return imports;
  });

  assert.equal(
    documentedImports.some(
      (entry) => entry.source === '@lapidist/design-lint/output',
    ),
    false,
  );

  const rootImports = documentedImports.filter(
    (entry) => entry.source === '@lapidist/design-lint',
  );
  assert.equal(rootImports.length > 0, true);

  const importedNames = new Set(rootImports.flatMap((entry) => entry.names));
  for (const importedName of importedNames) {
    assert.equal(
      rootExports.has(importedName),
      true,
      `docs/usage.md imports non-exported symbol "${importedName}" from @lapidist/design-lint`,
    );
  }
});
