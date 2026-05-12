---
title: design-token/border-width
description: "Enforce use of border width tokens."
---

# design-token/border-width

## Summary
Enforces `border-width` values in CSS and numeric literals in TypeScript inline style objects to match the border width tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/border-width": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `dimension`-type tokens with `dimensionType: "length"` under a `borderWidths` group:

```json
{
  "$version": "1.0.0",
  "borderWidths": {
    "sm": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": 1, "unit": "px" }
    },
    "lg": {
      "$type": "dimension",
      "$value": { "dimensionType": "length", "value": 4, "unit": "px" }
    }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
- `units` (`string[]`): CSS length units to validate for `border-width` values. Defaults to `['px', 'rem', 'em']`.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { border-width: 3px; }
```

### Valid

```css
.box { border-width: 1px; }
.box { border-width: 4px; }
```

## When Not To Use
If border widths are not standardized with tokens, disable this rule.

## Related Rules
- [design-token/border-radius](./border-radius.md)
- [design-token/colors](./colors.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
