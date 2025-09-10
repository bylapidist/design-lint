---
title: Plugins
description: "Extend design-lint with custom rules or formatters."
sidebar_position: 6
---

# Plugins

Plugins let you package and share rules, formatters, and other extensions. This guide targets developers who want to extend design-lint.

## Table of contents
- [Overview](#overview)
- [Creating a plugin](#creating-a-plugin)
- [Publishing and versioning](#publishing-and-versioning)
- [Distributing within a team](#distributing-within-a-team)
- [See also](#see-also)

## Overview
A plugin is an npm package that exports an object with a `rules` array. The package name forms the rule namespace: `<plugin>/<rule>`.

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

### 2. Implement rules
Rules receive a `RuleContext` which exposes `getFlattenedTokens` for accessing
design tokens by type. The helper returns an array of flattened tokens for the
current theme.

```ts
// index.ts
import type { RuleModule } from '@lapidist/design-lint';

const noRawColors: RuleModule<unknown> = {
  name: 'acme/no-raw-colors',
  meta: { description: 'disallow hex colors' },
  create(ctx) {
    const allowed = new Set(ctx.getFlattenedTokens('color').map(t => t.$value));
    return {
      Declaration(node) {
        if (node.property === 'color' && /^#/.test(node.value) && !allowed.has(node.value)) {
          // report violations
        }
      },
    };
  },
};

export default {
  rules: [noRawColors],
};
```

### 3. Test the plugin
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter, FileSource } from '@lapidist/design-lint';
import plugin from '../index.js';

void test('reports raw colors', async () => {
  const linter = new Linter({ plugins: [plugin], rules: { 'acme/no-raw-colors': 'error' } }, new FileSource());
  const res = await linter.lintText('h1 { color: #fff; }', 'file.css');
  assert.equal(res.messages.length, 1);
});
```

## Publishing and versioning
- Build to CommonJS or ESM before publishing.
- Follow semantic versioning and reference it in `peerDependencies`.
- Publish with `npm publish` or a private registry.

## Distributing within a team
You can share plugins privately via Git repositories or internal registries. Document rule options in the plugin README so users can configure them correctly.

## See also
- [API reference](./api.md)
- [Configuration](./configuration.md)
- [Formatters](./formatters.md)
