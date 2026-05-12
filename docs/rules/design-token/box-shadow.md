---
title: design-token/box-shadow
description: "Require box shadow tokens."
---

# design-token/box-shadow

## Summary
Enforces `box-shadow` values to match the shadow tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/box-shadow": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `shadow`-type tokens under a `shadows` group:

```json
{
  "$version": "1.0.0",
  "shadows": {
    "lg": {
      "$type": "shadow",
      "$value": {
        "blur": { "dimensionType": "length", "value": 4, "unit": "px" },
        "color": { "colorSpace": "srgb", "components": [0, 0, 0, 0.2] },
        "offsetX": { "dimensionType": "length", "value": 0, "unit": "px" },
        "offsetY": { "dimensionType": "length", "value": 2, "unit": "px" },
        "shadowType": "css.box-shadow",
        "spread": { "dimensionType": "length", "value": 0, "unit": "px" }
      }
    },
    "md": { "$type": "shadow", "$ref": "#/shadows/sm" },
    "sm": {
      "$type": "shadow",
      "$value": {
        "blur": { "dimensionType": "length", "value": 2, "unit": "px" },
        "color": { "colorSpace": "srgb", "components": [0, 0, 0, 0.1] },
        "offsetX": { "dimensionType": "length", "value": 0, "unit": "px" },
        "offsetY": { "dimensionType": "length", "value": 1, "unit": "px" },
        "shadowType": "css.box-shadow",
        "spread": { "dimensionType": "length", "value": 0, "unit": "px" }
      }
    }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

Shadow tokens use the `shadow` type with a `shadowType` context and sub-values for offsets, blur, spread, and color. The rule converts each token's `color` field from an sRGB object to a CSS `rgba()`/`rgb()` string for comparison. Zero-valued dimensions are matched without a unit (e.g. `0` not `0px`) to match common CSS authoring conventions.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

Given tokens `sm` = `0 1px 2px 0 rgba(0,0,0,0.1)` and `lg` = `0 2px 4px 0 rgba(0,0,0,0.2)`:

### Invalid

```css
/* 0 3px 6px 0 rgba(0,0,0,0.15) does not match any token */
.box { box-shadow: 0 3px 6px 0 rgba(0,0,0,0.15); }
```

### Valid

```css
/* matches sm token */
.box { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.1); }
/* multi-shadow: each segment must match a token */
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
