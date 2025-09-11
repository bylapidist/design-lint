---
title: design-token/line-height
description: "Use line height tokens."
---

# design-token/line-height

## Summary
Enforces `line-height` values to match the line-height tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "lineHeights": {
      "base": { "$type": "number", "$value": 1.5 },
      "tight": { "$type": "number", "$value": "{lineHeights.base}" }
    }
  },
  "rules": { "design-token/line-height": "error" }
}
```

Line-height tokens use the `number` type.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.text { line-height: 2; }
```

### Valid

```css
.text { line-height: 1.5; }
.text { line-height: 20px; }
```

## When Not To Use
If line heights are not standardized, disable this rule.

## Related Rules
- [design-token/font-size](./font-size.md)
- [design-token/letter-spacing](./letter-spacing.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
