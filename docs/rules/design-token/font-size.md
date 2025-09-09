---
title: design-token/font-size
description: "Use font size tokens."
---

# design-token/font-size

## Summary
Ensures `font-size` declarations use values from your `fontSizes` tokens.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "fontSizes": { "base": "1rem", "lg": 20 },
    "fonts": { "sans": "Inter, sans-serif" }
  },
  "rules": { "design-token/font-size": "error" }
}
```

Font-size tokens may be defined as numbers (interpreted as `px`) or strings with `px`, `rem`, or `em` units. These units are converted to pixel values for comparison.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.title { font-size: 18px; }
```

### Valid

```css
.title { font-size: 1rem; }
.title { font-size: 20px; }
```

## When Not To Use
If font sizes are not managed via tokens, disable this rule.

## Related Rules
- [design-token/font-family](./font-family.md)
- [design-token/line-height](./line-height.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
