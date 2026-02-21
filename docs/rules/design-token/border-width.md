---
title: design-token/border-width
description: "Enforce use of border width tokens."
---

# design-token/border-width

## Summary
Enforces `border-width` values to match the border width tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
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
  },
  "rules": { "design-token/border-width": "error" }
}
```

Border width tokens use the `dimension` type with `dimensionType` set to `length`.

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
