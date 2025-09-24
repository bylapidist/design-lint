---
title: design-token/box-shadow
description: "Require box shadow tokens."
---

# design-token/box-shadow

## Summary
Enforces `box-shadow` values to match the shadows tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "$version": "1.0.0",
    "color": {
      "shadow": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0, 0],
          "hex": "#000000",
          "alpha": 0.1
        }
      }
    },
    "shadows": {
      "sm": {
        "$type": "shadow",
        "$value": {
          "shadowType": "css.box-shadow",
          "offsetX": { "dimensionType": "length", "value": 0, "unit": "px" },
          "offsetY": { "dimensionType": "length", "value": 1, "unit": "px" },
          "blur": { "dimensionType": "length", "value": 2, "unit": "px" },
          "spread": { "dimensionType": "length", "value": 0, "unit": "px" },
          "color": { "$ref": "#/color/shadow" }
        }
      },
      "md": { "$type": "shadow", "$ref": "#/shadows/sm" }
    }
  },
  "rules": { "design-token/box-shadow": "error" }
}
```

Shadow tokens use the `shadow` type with a `shadowType` context and sub-values for offsets,
blur, spread, and color.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { box-shadow: 0 2px 4px 0 rgba(0,0,0,0.1); }
```

### Valid

```css
.box { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1); }
.box { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1), 0 2px 4px 0 rgba(0,0,0,0.2); }
```

## When Not To Use
If box shadows are not tokenized, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/border-radius](./border-radius.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
