---
title: design-token/outline
description: "Use outline tokens."
---

# design-token/outline

## Summary
Enforces `outline` values to match the outline tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "outlines": {
      "focus": { "$type": "string", "$value": "2px solid #000" },
      "active": { "$type": "string", "$value": "{outlines.focus}" }
    }
  },
  "rules": { "design-token/outline": "error" }
}
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { outline: 3px solid #000; }
```

### Valid

```css
.box { outline: 2px solid #000; }
```

## When Not To Use
If outline styles are not tokenized, disable this rule.

## Related Rules
- [design-token/border-color](./border-color.md)
- [design-token/border-width](./border-width.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
