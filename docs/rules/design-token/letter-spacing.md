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
    "letterSpacings": { "tight": "-0.05em", "loose": "0.1em" }
  },
  "rules": { "design-token/letter-spacing": "error" }
}
```

Letter-spacing tokens may be numbers (interpreted as `px`) or strings with `px`, `rem`, or `em` units. String values are normalized for comparison.

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
.text { letter-spacing: -0.05em; }
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
