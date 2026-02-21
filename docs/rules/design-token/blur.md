---
title: design-token/blur
description: "Ensure blur values use blur tokens."
---

# design-token/blur

## Summary
Enforces `blur()` values in `filter` or `backdrop-filter` to match the blur tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "$version": "1.0.0",
    "blurs": {
      "sm": {
        "$type": "dimension",
        "$value": { "dimensionType": "length", "value": 4, "unit": "px" }
      },
      "md": { "$type": "dimension", "$ref": "#/blurs/sm" }
    }
  },
  "rules": { "design-token/blur": "error" }
}
```

Blur tokens use the `dimension` type with `dimensionType` set to `length`.

## Options
- `units` (`string[]`): CSS length units to validate for `blur(...)` arguments. Defaults to `['px', 'rem', 'em']`.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { filter: blur(2px); }
```

### Valid

```css
.box { filter: blur(4px); }
```

## When Not To Use
If enforcing blur tokens is unnecessary, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/spacing](./spacing.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
