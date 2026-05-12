---
title: design-system/no-unused-tokens
description: "Report tokens defined but never used."
---

# design-system/no-unused-tokens

## Summary
Reports design tokens that are loaded in the DSR kernel but never referenced in any linted file. This keeps the token set focused and helps uncover stale values left behind after refactors.

Usage is tracked across the entire lint run by the token tracker. A token is considered used when it is referenced via a CSS variable (`var(--color-primary)`), a token path, or a JSON pointer in any linted source file.

> [!NOTE]
> Run the linter on the full project to avoid false positives. Tokens referenced in files excluded from the run will be reported as unused.
>
> This rule is strongest on statically analyzable patterns. Dynamic token construction may produce false positives or false negatives.

## Configuration
Enable this rule in `designlint.config.*`:

```json
{ "rules": { "design-system/no-unused-tokens": "warn" } }
```

Tokens are not configured inline. Seed the DSR kernel from your DTIF catalog before linting so the rule knows which tokens exist:

```bash
design-lint kernel start --config-path designlint.config.json
```

If a catalog contains `color/primary` and `color/unused` but only `color/primary` is referenced across the codebase (e.g. via `var(--color-primary)`), `color/unused` is reported as unused.

To exclude specific tokens from usage reporting:

```json
{
  "rules": {
    "design-system/no-unused-tokens": ["warn", { "ignore": ["--custom-color"] }]
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
