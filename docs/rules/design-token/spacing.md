---
title: design-token/spacing
description: "Use spacing tokens."
---

# design-token/spacing

## Summary
Enforces a spacing scale so that only configured token values or multiples of a base unit are allowed.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "$version": "1.0.0",
    "spacing": {
      "sm": {
        "$type": "dimension",
        "$value": { "dimensionType": "length", "value": 4, "unit": "px" }
      },
      "md": { "$type": "dimension", "$ref": "#/spacing/sm" }
    }
  },
  "rules": {
    "design-token/spacing": ["error", { "base": 4, "units": ["rem", "vw"] }]
  }
}
```

Spacing tokens use the `dimension` type with `dimensionType` set to `length`.

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

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
