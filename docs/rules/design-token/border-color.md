---
title: design-token/border-color
description: "Enforce use of border color tokens."
---

# design-token/border-color

## Summary
Enforces `border-color` values to match the border color tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "borderColors": {
      "primary": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [1, 1, 1] }
      },
      "secondary": { "$type": "color", "$ref": "#/borderColors/primary" }
    }
  },
  "rules": { "design-token/border-color": "error" }
}
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { border-color: #000000; }
```

### Valid

```css
.box { border-color: #ffffff; }
```

## When Not To Use
If border colors aren't standardized through tokens, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/border-width](./border-width.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
