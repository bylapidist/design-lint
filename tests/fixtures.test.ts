/**
 * Tests that built-in rules fire correctly against real fixture projects.
 *
 * Calls createLinter/lintTargets directly — no subprocess spawning.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/loader.js';
import { createLinter } from '../src/index.js';
import { FileSource } from '../src/adapters/node/file-source.js';
import { ConfigTokenProvider } from '../src/config/config-token-provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    files: [
      'src/App.module.css',
      'src/App.vue',
      'src/Multi.vue',
      'src/StyleBindings.vue',
    ],
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
  void test(`reports built-in rule violations in ${name} fixture`, async () => {
    const fixture = path.join(__dirname, 'fixtures', name);
    const configPath = path.join(fixture, 'designlint.config.json');

    const config = await loadConfig(fixture, configPath);
    const linter = createLinter(config, {
      documentSource: new FileSource(),
      tokenProvider: new ConfigTokenProvider(config),
    });
    const { results } = await linter.lintTargets([fixture]);

    const hasErrors = results.some((r) =>
      r.messages.some((m) => m.severity === 'error'),
    );
    assert.ok(hasErrors, `Expected violations in ${name} fixture`);

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
