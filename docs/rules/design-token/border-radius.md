---
title: design-token/border-radius
description: "Enforce use of border radius tokens."
---

# design-token/border-radius

## Summary
Enforces `border-radius` values to match the tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "borderRadius": {
      "sm": { "$type": "dimension", "$value": { "value": 2, "unit": "px" } },
      "lg": { "$type": "dimension", "$value": "{borderRadius.sm}" }
    }
  },
  "rules": { "design-token/border-radius": "error" }
}
```

Border radius tokens use the `dimension` type.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { border-radius: 3px; }
```

### Valid

```css
.box { border-radius: 4px; }
.box { border-radius: md; }
```

## When Not To Use
If border radius values are not standardized, disable this rule.

## Related Rules
- [design-token/border-width](./border-width.md)
- [design-token/colors](./colors.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
