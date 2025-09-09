---
title: Formatters
description: "Control how design-lint reports results or write your own formatter."
sidebar_position: 5
---

# Formatters

Formatters shape the output produced by design-lint. This page targets developers choosing report styles or authoring custom formatters.

## Table of contents
- [Built-in formatters](#built-in-formatters)
- [Selecting a formatter](#selecting-a-formatter)
- [Writing a custom formatter](#writing-a-custom-formatter)
- [Using formatters in CI](#using-formatters-in-ci)
- [See also](#see-also)

## Built-in formatters

| Name | Description |
| --- | --- |
| `stylish` | Human-friendly terminal output with colours and a summary. |
| `json` | Machine-readable output for scripts or dashboards. |
| `sarif` | Emits SARIF 2.1.0 for services like GitHub code scanning. |

## Selecting a formatter
Choose a formatter via the CLI or configuration file.

```bash
npx design-lint src --format json
```

```json
{
  "format": "json"
}
```

> **Tip:** Combine the `json` formatter with `--output` to generate artifacts in CI.

## Writing a custom formatter
A formatter exports a default function receiving lint results and returning a string.

```js
// formatter.js
export default function formatter(results) {
  return results.map((r) => r.sourceId).join('\n');
}
```

Invoke it with a relative path:

```bash
npx design-lint src --format ./formatter.js
```

For a reusable package, publish the formatter to npm and reference it by name. See the [plugins guide](./plugins.md#formatters-as-plugins) for packaging tips.

## Using formatters in CI
Formatters determine how results are captured by CI systems:

- `stylish` prints directly to the log.
- `json` can be parsed to annotate pull requests.
- `sarif` integrates with GitHub code scanning.

Store the report as an artifact for later inspection or feed it into additional tooling.

## See also
- [Plugins](./plugins.md)
- [CI integration](./ci.md)
