---
title: design-token/border-radius
description: "Enforce use of border radius tokens."
---

# design-token/border-radius

## Summary
Enforces `border-radius` values in CSS and numeric literals in TypeScript inline style objects to match the tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/border-radius": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `dimension`-type tokens with `dimensionType: "length"` under a `radius` group:

```json
{
  "$version": "1.0.0",
  "radius": {
    "sm": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": 2, "unit": "px" }
    },
    "lg": { "$type": "dimension", "$ref": "#/radius/sm" }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
- `units` (`string[]`): CSS length units to validate for `border-radius` values. Defaults to `['px', 'rem', 'em']`.

This rule is not auto-fixable.

## Examples

Given a `radius/sm` token with value `2px`:

### Invalid

```css
/* 3px does not match any token value */
.box { border-radius: 3px; }
```

### Valid

```css
/* matches token value */
.box { border-radius: 2px; }
/* CSS variable references are always allowed */
.box { border-radius: var(--radius-sm); }
```

```tsx
/* TypeScript inline style — numeric literal checked against token values */
<div style={{ borderRadius: 2 }} />
```

## When Not To Use
If border radius values are not standardized, disable this rule.

## Related Rules
- [design-token/border-width](./border-width.md)
- [design-token/colors](./colors.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
