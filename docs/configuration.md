---
title: Configuration
description: "Define how design-lint evaluates your project."
sidebar_position: 3
---

# Configuration

This page explains every option in `designlint.config.*`. It targets developers adjusting the linter to their workflow.

## Table of contents
- [Basic config](#basic-config)
- [Tokens](#tokens)
- [Rules and severity](#rules-and-severity)
- [Plugins](#plugins)
- [Overrides](#overrides)
- [JS and TS config files](#js-and-ts-config-files)
- [Common patterns](#common-patterns)
- [See also](#see-also)

## Basic config
Create a configuration file at the project root:

```json
{
  "tokens": {},
  "rules": {}
}
```

The file may be `designlint.config.json`, `.js`, `.ts`, `.mjs`, or `.mts`.

### Top-level options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `tokens` | object | `undefined` | Defines [design tokens](./glossary.md#design-tokens) available to rules. |
| `rules` | object | `undefined` | Enables [rules](./rules/index.md) and sets their severity. |
| `plugins` | string[] | `[]` | Loads additional [plugins](./plugins.md). |
| `ignoreFiles` | string[] | `[]` | Glob patterns ignored during linting. |
| `patterns` | string[] | `[]` | File patterns to lint when none are passed on the CLI. |
| `concurrency` | number | `os.cpus()` | Maximum parallel workers. |
| `wrapTokensWithVar` | boolean | `false` | Wrap token values with `var()` when autofixing CSS. |


## Tokens
Tokens describe the design system in a machine-readable form. You can inline tokens or reference separate JSON files. Example:

```json
{
  "tokens": {
    "colors": { "primary": "#ff0000" },
    "spacing": { "sm": 4 }
  }
}
```

To group tokens by theme, provide an object keyed by theme name. Each theme contains the same token categories.

## Rules and severity
Enable a rule by adding it to the `rules` map with a severity:

```json
{
  "rules": {
    "design-token/colors": "error",
    "design-system/component-usage": ["warn", { "substitutions": { "button": "DSButton" } }]
  }
}
```

Severity values: `"off"`, `"warn"`, `"error"`, or numeric `0`, `1`, `2`. Many rules accept options; see the [rule reference](./rules/index.md).

## Plugins
Plugins bundle custom rules or formatters. Install the package and list it in `plugins`:

```json
{
  "plugins": ["@company/design-lint-plugin"]
}
```

See the [plugins guide](./plugins.md) to author and publish your own.

## Overrides
Use overrides to apply different settings to specific files. Create separate configuration files in subdirectories or use a JavaScript config file to inspect file paths at runtime.

## JS and TS config files
Configuration can be written in JavaScript or TypeScript for dynamic setups:

```ts
// designlint.config.ts
import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: { colors: { primary: '#ff0000' } },
  rules: { 'design-token/colors': 'error' },
});
```

## Common patterns
- Share configs across repositories with npm packages.
- Combine with framework presets; see [framework integrations](./frameworks.md).
- Set `patterns` to lint only changed files in CI.

## See also
- [Rule reference](./rules/index.md)
- [Plugins](./plugins.md)
- [Troubleshooting](./troubleshooting.md)
