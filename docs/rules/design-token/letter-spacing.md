---
title: design-token/letter-spacing
description: "Use letter spacing tokens."
---

# design-token/letter-spacing

## Summary
Enforces `letter-spacing` values to match the letter-spacing tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "letterSpacings": {
      "tight": { "$type": "dimension", "$value": { "value": -0.05, "unit": "rem" } },
      "loose": { "$type": "dimension", "$ref": "#/letterSpacings/tight" }
    }
  },
  "rules": { "design-token/letter-spacing": "error" }
}
```

Letter-spacing tokens use the `dimension` type.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.text { letter-spacing: 2px; }
```

### Valid

```css
.text { letter-spacing: -0.05rem; }
.text { letter-spacing: 0; }
```

## When Not To Use
If letter spacing is not standardized, disable this rule.

## Related Rules
- [design-token/font-size](./font-size.md)
- [design-token/line-height](./line-height.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
