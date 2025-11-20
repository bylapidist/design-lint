import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const tsxLoader = require.resolve('tsx/esm');

const baselineRules = [
  'design-system/component-usage',
  'design-system/deprecation',
  'design-token/colors',
  'design-token/spacing',
  'design-token/font-size',
  'design-token/font-family',
];

interface Fixture {
  name: string;
  files: string[];
  rules: string[];
}

const fixtures: Fixture[] = [
  {
    name: 'react-vite-css-modules',
    files: ['src/App.module.css', 'src/App.tsx', 'designlint.config.json'],
    rules: [...baselineRules, 'design-system/no-unused-tokens'],
  },
  {
    name: 'svelte',
    files: [
      'src/App.module.css',
      'src/App.svelte',
      'src/ControlFlow.svelte',
      'src/Directive.svelte',
    ],
    rules: baselineRules,
  },
  {
    name: 'vue',
    files: ['src/App.module.css', 'src/App.vue', 'src/Multi.vue'],
    rules: baselineRules.filter(
      (rule) => rule !== 'design-system/component-usage',
    ),
  },
  {
    name: 'nextjs',
    files: ['styles/Home.module.css', 'pages/index.tsx'],
    rules: baselineRules,
  },
  {
    name: 'nuxt',
    files: ['pages/index.module.css', 'pages/index.vue'],
    rules: baselineRules,
  },
  {
    name: 'remix',
    files: ['app/styles.module.css', 'app/routes/_index.tsx'],
    rules: baselineRules,
  },
  {
    name: 'web-components',
    files: [
      'src/component.css',
      'src/component.tsx',
      'src/component.mjs',
      'src/component.cjs',
      'src/component.mts',
      'src/component.cts',
    ],
    rules: baselineRules,
  },
];

for (const { name, files, rules } of fixtures) {
  void test(`CLI reports built-in rule violations in ${name} fixture`, () => {
    const fixture = path.join(__dirname, 'fixtures', name);
    const cli = path.join(__dirname, '..', 'src', 'cli', 'index.ts');
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        tsxLoader,
        cli,
        fixture,
        '--config',
        path.join(fixture, 'designlint.config.json'),
        '--format',
        'json',
      ],
      { encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0);
    interface Result {
      sourceId: string;
      messages: { ruleId: string }[];
    }
    const parsed = JSON.parse(result.stdout) as unknown;
    assert(Array.isArray(parsed));
    const results = parsed as Result[];
    const byFile = Object.fromEntries(
      results.map((r) => [
        path.relative(fixture, r.sourceId),
        new Set(r.messages.map((m) => m.ruleId)),
      ]),
    );
    assert.deepEqual(Object.keys(byFile).sort(), files.sort());
    const ruleSet = new Set(
      results.flatMap((r) => r.messages.map((m) => m.ruleId)),
    );
    assert.deepEqual(Array.from(ruleSet).sort(), rules.slice().sort());
  });
}
