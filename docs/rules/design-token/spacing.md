---
title: design-token/spacing
description: "Use spacing tokens."
---

# design-token/spacing

## Summary
Enforces a spacing scale across **all** CSS declarations — any dimension value (in `px`, `rem`, `em` by default) must either match a spacing token value or be a multiple of the configured base unit. JavaScript numeric literals and template literal values in style objects are also checked.

For narrower enforcement limited to specific layout properties (margin, padding, gap, etc.), see [`design-system/no-hardcoded-spacing`](../design-system/no-hardcoded-spacing.md).

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/spacing": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `dimension`-type tokens with `dimensionType: "length"` under a `spacing` group:

```json
{
  "$version": "1.0.0",
  "spacing": {
    "sm": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": 4, "unit": "px" }
    },
    "md": { "$type": "dimension", "$ref": "#/spacing/sm" }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

To configure the base unit and allowed CSS units, pass options:

```json
{ "rules": { "design-token/spacing": ["error", { "base": 4, "units": ["px", "rem"] }] } }
```

## Options
- `base` (`number`): values must be multiples of this number. Defaults to `4`.
- `units` (`string[]`): CSS units to validate. Defaults to `['px', 'rem', 'em']`.
- `strictReference` (`boolean`): when `true`, token-equivalent raw spacing literals are reported for the supported static numeric unit patterns this rule parses (for example `px`, `rem`, `em`, including literals found inside CSS functions). Token references such as `var(--...)` remain allowed. Defaults to `false`.

Numbers that appear inside CSS functions (e.g., `calc()`, `var()`) are ignored in value-equivalence mode.

### Enforcement modes
- **Value-equivalence mode** (default): allows values that match token values or the configured base scale.
- **Strict reference mode** (`strictReference: true`): reports token-equivalent raw literals in supported static numeric forms instead of allowing them by value match.

Strict mode is stricter by design and may increase migration effort in codebases that currently depend on scale-aligned literals.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { margin: 5px; }
```

### Valid

```css
.box { margin: 8px; }
.box { margin: var(--spacing-md); }
.box { margin: calc(100% - 5px); }
.box { margin: var(--space, 5px); }
```

## When Not To Use
If spacing values do not follow a scale, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/font-size](./font-size.md)
- [design-system/no-hardcoded-spacing](../design-system/no-hardcoded-spacing.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
