---
title: design-system/no-unused-tokens
description: "Report tokens defined but never used."
---

# design-system/no-unused-tokens

## Summary
Reports design tokens defined in your configuration that never appear in any linted file. This keeps the token set focused and helps uncover stale values left behind after refactors.

The rule scans each file for raw values like hex colors, numeric spacing values and `var(--token)` references. Hex codes are matched case‑insensitively and both CSS variables and literal values are detected.

> [!NOTE]
> Run the linter on the full project to avoid false positives. Tokens referenced in files that are excluded from the run will be reported as unused.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

Given this configuration:

```json
{
  "tokens": {
    "color": {
      "primary": { "$type": "color", "$value": "#000000" },
      "unused": { "$type": "color", "$value": "{color.primary}" }
    }
  },
  "rules": { "design-system/no-unused-tokens": "warn" }
}
```

and the source:

```ts
const color = '#000000';
```

`#ff0000` is reported as unused.

A CSS variable can also be ignored:

```json
{
  "rules": {
    "design-system/no-unused-tokens": [
      "warn",
      { "ignore": ["--custom-color"] }
    ]
  }
}
```

## Options

### ignore
Type: `string[]`

Array of token values or CSS variable names to exclude from usage reporting.

```json
{
  "rules": {
    "design-system/no-unused-tokens": ["warn", { "ignore": ["#ff0000"] }]
  }
}
```

This rule is not auto-fixable.

## Examples

### Invalid

Any token defined but not used in the project is reported.

### Valid

All defined tokens are referenced at least once.

## When Not To Use
If unused tokens are acceptable or token usage is tracked elsewhere, disable this rule.

## Related Rules
- [design-system/deprecation](./deprecation.md)
- [design-token/colors](../design-token/colors.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
