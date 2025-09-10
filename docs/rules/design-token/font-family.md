---
title: design-token/font-family
description: "Use font family tokens in typography."
---

# design-token/font-family

## Summary
Ensures `font-family` declarations use values from your `fonts` tokens.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "fonts": { "$type": "fontFamily", "sans": { "$value": "Inter, sans-serif" } }
  },
  "rules": { "design-token/font-family": "error" }
}
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.title { font-family: 'Arial'; }
```

### Valid

```css
.title { font-family: "Inter, sans-serif"; }
```

## When Not To Use
If arbitrary font families are allowed, disable this rule.

## Related Rules
- [design-token/font-size](./font-size.md)
- [design-token/font-weight](./font-weight.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
