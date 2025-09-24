---
title: design-token/font-weight
description: "Use font weight tokens."
---

# design-token/font-weight

## Summary
Enforces `font-weight` values to match the font weight tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "$version": "1.0.0",
    "fontWeights": {
      "regular": { "$type": "fontWeight", "$value": 400 },
      "bold": { "$type": "fontWeight", "$value": 700 },
      "emphasis": { "$type": "fontWeight", "$ref": "#/fontWeights/bold" }
    }
  },
  "rules": { "design-token/font-weight": "error" }
}
```

Font-weight tokens may be numbers or strings (e.g., `"bold"`). Numeric tokens allow equivalent numeric CSS values and JavaScript numeric literals.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.text { font-weight: 500; }
```

### Valid

```css
.text { font-weight: 400; }
.text { font-weight: bold; }
```

## When Not To Use
If arbitrary font weights are allowed, disable this rule.

## Related Rules
- [design-token/font-family](./font-family.md)
- [design-token/font-size](./font-size.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
