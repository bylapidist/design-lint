---
title: Plugins
description: "Extend design-lint with custom rule plugins."
sidebar_position: 6
---

# Plugins

Plugins let you package and share custom rules and related runtime hooks. This guide targets developers who want to extend design-lint.

## Table of contents
- [Overview](#overview)
- [Creating a plugin](#creating-a-plugin)
- [Publishing and versioning](#publishing-and-versioning)
- [Distributing within a team](#distributing-within-a-team)
- [See also](#see-also)

## Overview
A plugin is an npm package that exports an object with at least a `rules` array.
Plugins may also optionally specify `name`, `version`, and an `init(env)` function
for running setup logic. The package name forms the rule namespace:
`<plugin>/<rule>`.

> **Note:** Declare `@lapidist/design-lint` as a `peerDependency` to ensure users install a compatible version.

## Creating a plugin
### 1. Scaffold the project
```text
my-plugin/
├─ package.json
└─ index.ts
```

`package.json`:
```json
{
  "name": "design-lint-plugin-acme",
  "type": "module",
  "peerDependencies": { "@lapidist/design-lint": "^1.0.0" }
}
```

### 2. Implement rules and metadata
Rules receive a `RuleContext` which exposes `getDtifTokens` for accessing
canonical DTIF entries by type. The records include pointers, normalized path
segments, resolved values, and metadata describing aliases or deprecations. Use
`getTokenPath(token)` to derive the dot-delimited path for a DTIF token with the
configured name transform. The plugin can also expose a `name`, `version`, and
an `init` hook that receives the runtime environment.

```ts
// index.ts
import type { RuleModule, PluginModule } from '@lapidist/design-lint';

const noRawColors: RuleModule<unknown> = {
  name: 'acme/no-raw-colors',
  meta: { description: 'disallow hex colors' },
  create(ctx) {
    const allowed = new Set(
      ctx.getDtifTokens('color')
        .map((t) => t.value)
        .filter((value): value is string => typeof value === 'string'),
    );
    return {
      onCSSDeclaration(decl) {
        if (decl.prop === 'color' && /^#/.test(decl.value) && !allowed.has(decl.value)) {
          ctx.report({
            message: `Unexpected raw color "${decl.value}". Use a DTIF token.`,
            line: decl.line,
            column: decl.column,
          });
        }
      },
    };
  },
};

const plugin: PluginModule = {
  name: 'acme',
  version: '1.0.0',
  rules: [noRawColors],
  init(env) {
    // optional setup using env
  },
};

export default plugin;
```

Minimal valid rule skeleton (matches `RuleModule`):

```ts
import type { RuleModule } from '@lapidist/design-lint';

export const rule: RuleModule = {
  name: 'acme/example',
  meta: { description: 'describe what this rule checks' },
  create(ctx) {
    return {
      onCSSDeclaration(decl) {
        ctx.report({
          message: `Saw declaration ${decl.prop}: ${decl.value}`,
          line: decl.line,
          column: decl.column,
        });
      },
      onNode(node) {
        void node;
      },
    };
  },
};
```

At runtime, plugins are validated to ensure they export `{ rules: RuleModule[] }`
and each rule has a non-empty `name`, `meta.description`, and `create` function.

Rules can expose a [Zod](https://zod.dev/) schema for their options via
`meta.schema`. The engine validates user-supplied options against the schema
and rejects invalid configurations.

```ts
import { z } from 'zod';

const rule: RuleModule<{ ignore?: string[] }> = {
  name: 'acme/example',
  meta: {
    description: 'example rule',
    schema: z.object({ ignore: z.array(z.string()).optional() }),
  },
  create(ctx) {
    // ctx.options is typed and validated
    return {};
  },
};
```

### 3. Bridge non-DTIF token sources
If your plugin consumes design tokens from other tools, convert them to DTIF
before validation. Parse the converted document through the canonical parser so
downstream rules receive pointer-aware data:

```ts
import {
  parseDtifTokenObject,
  type DesignTokens,
  type PluginModule,
} from '@lapidist/design-lint';

const plugin: PluginModule = {
  rules: [noRawColors],
  async init() {
    const figmaTokens = await loadFromFigma();
    const { document } = await parseDtifTokenObject(figmaTokens, {
      uri: 'figma://project/tokens.json',
    });
    if (!document) throw new Error('Failed to convert tokens to DTIF');
    // persist document.data for the linter or your tooling
  },
};

export default plugin;

async function loadFromFigma(): Promise<DesignTokens> {
  // convert tokens here and return a DTIF-compatible object
  return {
    $version: '1.0.0',
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [0, 0.66, 1] },
      },
      accent: { $type: 'color', $ref: '#/color/primary' },
    },
  } satisfies DesignTokens;
}
```

### 4. Test the plugin
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinter, createNodeEnvironment } from '@lapidist/design-lint';
import plugin from '../index.js';

void test('reports raw colors', async () => {
  const config = {
    plugins: [plugin],
    rules: { 'acme/no-raw-colors': 'error' },
  };
  const linter = createLinter(config, createNodeEnvironment(config));
  const res = await linter.lintDocument({
    id: 'file.css',
    type: 'css',
    getText: async () => 'h1 { color: #fff; }',
  });
  assert.equal(res.messages.length, 1);
});
```

## Publishing and versioning
- Build to CommonJS or ESM before publishing.
- Follow semantic versioning and reference it in `peerDependencies`.
- Publish with `npm publish` or a private registry.

## Distributing within a team
You can share plugins privately via Git repositories or internal registries. Document rule options in the plugin README so users can configure them correctly.

## Rule plugins vs formatter modules
Rule plugins and formatters are loaded through different paths:

- `plugins` config entries are rule plugins. They are resolved and validated by
  the plugin system and must export a `PluginModule`.
- `--format` (or `format` config) points to a formatter module. Formatter
  modules are imported directly from the provided module name or file path and
  are **not** registered through `PluginManager`.

Custom formatter packages can still be published to npm, but they are consumed
as standalone formatter modules, not as rule plugins.

```json
{
  "name": "design-lint-formatter-acme",
  "type": "module",
  "peerDependencies": { "@lapidist/design-lint": "^6.0.0" }
}
```

After publishing, consumers can use the package name directly:

```bash
npx design-lint src --format design-lint-formatter-acme
```

For the exact invocation patterns (module name and relative path), see
[Formatters](./formatters.md#writing-a-custom-formatter):

```bash
npx design-lint src --format design-lint-formatter-acme
npx design-lint src --format ./formatter.js
```

## See also
- [API reference](./api.md)
- [Configuration](./configuration.md)
- [Formatters](./formatters.md)
