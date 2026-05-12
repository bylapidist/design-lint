---
title: design-token/letter-spacing
description: "Use letter spacing tokens."
---

# design-token/letter-spacing

## Summary
Enforces `letter-spacing` values in CSS and numeric literals in TypeScript inline style objects to match the letter-spacing tokens loaded into the DSR kernel.

Values are normalised to pixel equivalents before comparison (`rem × 16`, `px × 1`).

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/letter-spacing": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `dimension`-type tokens with `dimensionType: "length"` under a `letterSpacings` group:

```json
{
  "$version": "1.0.0",
  "letterSpacings": {
    "tight": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": -0.05, "unit": "rem" }
    },
    "loose": { "$type": "dimension", "$ref": "#/letterSpacings/tight" }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

Given a `tight` token with value `-0.05rem` (= `-0.8px`):

### Invalid

```css
/* 2px does not match any token */
.text { letter-spacing: 2px; }
/* 0 is not a token value */
.text { letter-spacing: 0; }
```

### Valid

```css
/* matches tight token (-0.05rem = -0.8px) */
.text { letter-spacing: -0.05rem; }
.text { letter-spacing: -0.8px; }
```

## When Not To Use
If letter spacing is not standardized, disable this rule.

## Related Rules
- [design-token/font-size](./font-size.md)
- [design-token/line-height](./line-height.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
