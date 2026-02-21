import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as cssParsers from '../../src/core/framework-parsers/css-parser.js';
import { lintTS } from '../../src/core/framework-parsers/ts-parser.js';
import { lintVue } from '../../src/core/framework-parsers/vue-parser.js';
import { lintSvelte } from '../../src/core/framework-parsers/svelte-parser.js';
import { collectTextTokenReferences } from '../../src/core/framework-parsers/token-references.js';
import postcss from 'postcss';
import type {
  CSSDeclaration,
  LintMessage,
  RegisteredRuleListener,
  RuleListener,
} from '../../src/core/types.js';

const asRegisteredListener = (
  listener: RuleListener,
  ruleId = 'test/listener',
): RegisteredRuleListener => ({
  ruleId,
  listener,
});

void test('parseCSS handles CSS, SCSS, LESS and parser errors', () => {
  const cssMessages: LintMessage[] = [];
  const cssDecls = cssParsers.parseCSS('a { color: red; }', cssMessages);
  assert.equal(cssDecls.length, 1);
  assert.equal(cssDecls[0]?.prop, 'color');
  assert.equal(cssMessages.length, 0);

  const scssDecls = cssParsers.parseCSS(
    '$primary: #fff;\n.btn { color: $primary; }',
    [],
    'scss',
  );
  assert.ok(scssDecls.some((decl) => decl.value.includes('$primary')));

  const lessDecls = cssParsers.parseCSS(
    '@primary: #fff;\n.btn { color: @primary; }',
    [],
    'less',
  );
  assert.ok(lessDecls.some((decl) => decl.value.includes('@primary')));

  const restore = mock.method(postcss, 'parse', () => {
    throw Object.assign(new Error('boom'), { line: 3, column: 7 });
  });
  try {
    const messages: LintMessage[] = [];
    const decls = cssParsers.parseCSS('a { color: red; }', messages);
    assert.equal(decls.length, 0);
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.ruleId, 'parse-error');
    assert.equal(messages[0]?.line, 3);
    assert.equal(messages[0]?.column, 7);
  } finally {
    restore.mock.restore();
  }
});

const createCollector = () => {
  const cssDecls: CSSDeclaration[] = [];
  return {
    listener: {
      onCSSDeclaration(decl: CSSDeclaration) {
        cssDecls.push({ ...decl });
      },
    },
    cssDecls,
  };
};

void test('lintCSS selects parser language from filename', () => {
  const messages: LintMessage[] = [];
  const { listener, cssDecls } = createCollector();
  const cssResult = cssParsers.lintCSS(
    '.btn { color: red; }',
    'file.css',
    [asRegisteredListener(listener)],
    messages,
  );
  const scssResult = cssParsers.lintCSS(
    '$primary: #fff;\n.btn { color: $primary; }',
    'file.scss',
    [asRegisteredListener(listener)],
    messages,
  );
  const lessResult = cssParsers.lintCSS(
    '@primary: #fff;\n.btn { color: @primary; }',
    'file.less',
    [asRegisteredListener(listener)],
    messages,
  );
  assert.ok(Array.isArray(cssResult.tokenReferences));
  assert.ok(Array.isArray(scssResult.tokenReferences));
  assert.ok(Array.isArray(lessResult.tokenReferences));
  assert.ok(cssDecls.some((decl) => decl.value === 'red'));
  assert.ok(cssDecls.some((decl) => decl.value.includes('$primary')));
  assert.ok(cssDecls.some((decl) => decl.value.includes('@primary')));
  assert.equal(messages.length, 0);
});

void test('collectTextTokenReferences extracts only explicit token syntaxes by default', () => {
  const references =
    [] as import('../../src/core/types.js').TokenReferenceCandidate[];
  collectTextTokenReferences(
    references,
    [
      'https://cdn.example.com/color.primary/icon.svg',
      'app.theme.palette.primary',
      '1.2.3',
      '@scope/ui.color.primary',
      'import tokens from "@acme/design.tokens";',
      '{color.primary}',
      '#/color/secondary',
      'var(--color-accent)',
    ].join('\n'),
    1,
    1,
    'test:string',
  );

  assert.deepEqual(
    references.map((reference) => ({
      kind: reference.kind,
      identity: reference.identity,
    })),
    [
      { kind: 'css-var', identity: '--color-accent' },
      { kind: 'token-path', identity: 'color.primary' },
      { kind: 'alias-pointer', identity: '#/color/secondary' },
    ],
  );
});

void test('collectTextTokenReferences ignores incidental raw paths in free text contexts', () => {
  const references =
    [] as import('../../src/core/types.js').TokenReferenceCandidate[];
  collectTextTokenReferences(
    references,
    [
      'Release 1.2.3 for package @scope/ui.color.primary',
      'See docs at app.theme.palette.primary for details',
      'Import from https://cdn.example.com/color.primary/icon.svg',
    ].join('\n'),
    1,
    1,
    'ts:string',
    { includeRawPaths: true },
  );

  assert.equal(references.length, 0);
});

void test('collectTextTokenReferences keeps raw path extraction for style and template contexts', () => {
  const references =
    [] as import('../../src/core/types.js').TokenReferenceCandidate[];
  collectTextTokenReferences(
    references,
    [
      'color.primary',
      'font.size.200',
      '{spacing.200}',
      'var(--color-accent)',
      '#/color/primary',
    ].join('; '),
    1,
    1,
    'ts-template:value',
    { includeRawPaths: true },
  );

  assert.deepEqual(
    references.map((reference) => ({
      kind: reference.kind,
      identity: reference.identity,
    })),
    [
      { kind: 'css-var', identity: '--color-accent' },
      { kind: 'token-path', identity: 'spacing.200' },
      { kind: 'token-path', identity: 'color.primary' },
      { kind: 'token-path', identity: 'font.size.200' },
      { kind: 'alias-pointer', identity: '#/color/primary' },
    ],
  );
});

void test('lintTS dispatches declarations from inline styles and tagged templates', () => {
  const text = `const Styled = styled.div\`\n  color: var(--primary);\n\`;\nconst Box = styled('div')\`border-width: 2px;\`;\nconst Global = css\`background-color: blue;\`;\nconst TwStyles = tw\`border-color: green;\`;\nconst Component = () => (\n  <div style="color: red; width: 2px;">content</div>\n);`;
  const decls: string[] = [];
  const listener = {
    onCSSDeclaration(decl: CSSDeclaration) {
      decls.push(`${decl.prop}:${decl.value}`);
    },
  };
  const messages: LintMessage[] = [];
  const result = lintTS(
    text,
    'component.tsx',
    [asRegisteredListener(listener)],
    messages,
  );
  assert.ok(
    result.tokenReferences?.some(
      (ref) => ref.kind === 'css-var' && ref.identity === '--primary',
    ),
  );
  assert.ok(decls.some((value) => value.startsWith('color')));
  assert.ok(decls.some((value) => value.startsWith('width')));
  assert.ok(decls.some((value) => value.includes('border-width')));
  assert.ok(decls.some((value) => value.includes('background-color')));
  assert.ok(decls.some((value) => value.includes('border-color')));
  assert.equal(messages.length, 0);
});

void test('lintTS offsets parse errors relative to attribute locations', () => {
  const text = [
    'const App = () => (',
    '  <>',
    '    <div style="color"></div>',
    '    <div style="color:red;',
    'margin"></div>',
    '  </>',
    ');',
  ].join('\n');
  const messages: LintMessage[] = [];
  lintTS(text, 'app.tsx', [], messages);
  assert.deepEqual(
    messages.map((m) => ({ ruleId: m.ruleId, line: m.line, column: m.column })),
    [
      { ruleId: 'parse-error', line: 2, column: 16 },
      { ruleId: 'parse-error', line: 4, column: 1 },
    ],
  );
});

void test('lintVue processes scripts and style blocks', async () => {
  const text = `\n<template>\n  <div class="btn">{{ palette.primary }}</div>\n</template>\n<script>const scriptValue = 'one';</script>\n<script setup>const setupValue = scriptValue;</script>\n<style>.btn { color: red; }</style>\n<style lang="scss">$border: 2px; .btn { border-width: $border; }</style>`;
  const identifiers = new Set<string>();
  const decls: string[] = [];
  const listener = {
    onNode(node: ts.Node) {
      if (ts.isIdentifier(node)) identifiers.add(node.getText());
    },
    onCSSDeclaration(decl: CSSDeclaration) {
      decls.push(`${decl.prop}:${decl.value}`);
    },
  };
  const messages: LintMessage[] = [];
  const result = await lintVue(
    text,
    'component.vue',
    [asRegisteredListener(listener)],
    messages,
  );
  const vueReferences = result.tokenReferences ?? [];
  assert.ok(vueReferences.length);
  assert.ok(
    vueReferences.some(
      (ref) => ref.kind === 'token-path' && ref.identity === 'palette.primary',
    ),
  );
  assert.ok(identifiers.has('scriptValue'));
  assert.ok(identifiers.has('setupValue'));
  assert.ok(decls.includes('color:red'));
  assert.ok(decls.includes('border-width:$border'));
  assert.equal(messages.length, 0);
});

void test('lintSvelte extracts attributes, directives, scripts and style tags', async () => {
  const text = `\n<script>\n  let color = '#fff';\n  let disabled = false;\n  const instanceWidth = 2;\n  const promise = Promise.resolve('value');\n</script>\n<script context="module">\n  const moduleValue = 'var(--bg)';\n</script>\n{#if !disabled}\n  <div style="color: {color}; width: {instanceWidth * 2}px;">\n    <span style:background={color}></span>\n  </div>\n{:else}\n  <button style="border-color: {moduleValue};"></button>\n{/if}\n{#await promise then result}\n  <p style="opacity: {result.length};"></p>\n{:catch error}\n  <p style="opacity: {error.length};"></p>\n{/await}\n<style lang="scss">.btn { padding: 4px; }</style>`;
  const identifiers = new Set<string>();
  const decls: string[] = [];
  const listener = {
    onNode(node: ts.Node) {
      if (ts.isIdentifier(node)) identifiers.add(node.getText());
    },
    onCSSDeclaration(decl: CSSDeclaration) {
      decls.push(`${decl.prop}:${decl.value}`);
    },
  };
  const messages: LintMessage[] = [];
  const result = await lintSvelte(
    text,
    'component.svelte',
    [asRegisteredListener(listener)],
    messages,
  );
  const svelteReferences = result.tokenReferences ?? [];
  assert.ok(svelteReferences.length);
  assert.ok(
    svelteReferences.some(
      (ref) => ref.kind === 'css-var' && ref.identity === '--bg',
    ),
  );
  assert.ok(identifiers.has('color'));
  assert.ok(identifiers.has('moduleValue'));
  assert.ok(identifiers.has('promise'));
  assert.ok(decls.some((d) => d.startsWith('color')));
  assert.ok(decls.some((d) => d.startsWith('width')));
  assert.ok(decls.some((d) => d.includes('border-color')));
  assert.ok(decls.some((d) => d.includes('opacity')));
  assert.ok(decls.some((d) => d.includes('padding:4px')));
  assert.equal(messages.length, 0);
});
