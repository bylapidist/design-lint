---
title: design-system/no-unused-tokens
description: "Report tokens defined but never used."
---

# design-system/no-unused-tokens

## Summary
Reports design tokens defined in your configuration that never appear in any linted file. This keeps the token set focused and helps uncover stale values left behind after refactors.

The rule is semantic-only: usage is resolved from explicit token references and
normalised identities (for example token paths, JSON pointers, and CSS variable
names). Raw literals are not treated as token usage.

> [!NOTE]
> Run the linter on the full project to avoid false positives. Tokens referenced in files that are excluded from the run will be reported as unused.
>
> This rule is strongest on statically analyzable patterns. Dynamic token
> construction may produce false positives or false negatives.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

Given this configuration:

```json
{
  "tokens": {
    "$version": "1.0.0",
    "color": {
      "primary": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0, 0]
        }
      },
      "unused": { "$type": "color", "$ref": "#/color/primary" }
    }
  },
  "rules": { "design-system/no-unused-tokens": "warn" }
}
```

and the source:

```ts
const color = '{color.primary}';
```

the `color.unused` token is reported as unused.

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

Array of token values, token paths, or CSS variable names to exclude from usage reporting.

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
