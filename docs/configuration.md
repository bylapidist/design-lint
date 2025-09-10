---
title: Configuration
description: 'Define how design-lint evaluates your project.'
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

| Option              | Type     | Default     | Description                                                                                                                                       |
| ------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens`            | object   | `undefined` | A [W3C Design Tokens](./glossary.md#design-tokens) tree or a map of themes. Theme values may be inline token objects or paths to `.tokens` files. |
| `rules`             | object   | `undefined` | Enables [rules](./rules/index.md) and sets their severity.                                                                                        |
| `plugins`           | string[] | `[]`        | Loads additional [plugins](./plugins.md).                                                                                                         |
| `ignoreFiles`       | string[] | `[]`        | Glob patterns ignored during linting.                                                                                                             |
| `patterns`          | string[] | `[]`        | File patterns to lint when none are passed on the CLI.                                                                                            |
| `concurrency`       | number   | `os.cpus()` | Maximum parallel workers.                                                                                                                         |
| `wrapTokensWithVar` | boolean  | `false`     | Wrap token values with `var()` when autofixing CSS.                                                                                               |

## Tokens

Tokens describe the design system in a machine-readable form. Provide a W3C Design Tokens object directly or supply a map of theme names.

Inline example:

```json
{
  "tokens": {
    "color": {
      "primary": { "$type": "color", "$value": "#ff0000" },
      "secondary": { "$type": "color", "$value": "{color.primary}" }
    }
  }
}
```

To group tokens by theme, supply an object keyed by theme name. Each theme may contain an inline token tree or a path to an external token file. Paths resolve relative to the configuration file:

```json
{
  "tokens": {
    "light": "./light.tokens.json",
    "dark": {
      "color": {
        "primary": { "$type": "color", "$value": "#ffffff" },
        "secondary": { "$type": "color", "$value": "{color.primary}" }
      }
    }
  }
}
```

Token files should use the `.tokens` or `.tokens.json` extension and are typically served with the `application/design-tokens+json` MIME type.

Design token files are validated strictly:

- Token and group names may not include `{`, `}`, or `.` and names differing only by case are rejected.
- `$extensions` keys must contain at least one dot to avoid collisions.
- Alias references must resolve to tokens of the same `$type` and cyclic or unknown aliases raise errors.
- Composite token objects such as `shadow`, `strokeStyle`, `gradient`, and `typography` may only include the fields defined by the specification.

## Rules and severity

Enable a rule by adding it to the `rules` map with a severity:

```json
{
  "rules": {
    "design-token/colors": "error",
    "design-system/component-usage": [
      "warn",
      { "substitutions": { "button": "DSButton" } }
    ]
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
  tokens: {
    color: {
      primary: { $type: 'color', $value: '#ff0000' },
      secondary: { $type: 'color', $value: '{color.primary}' },
    },
  },
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
