---
title: design-token/box-shadow
description: "Require box shadow tokens."
---

# design-token/box-shadow

## Summary
Enforces `box-shadow` values to match the shadows tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": { "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.1)" } },
  "rules": { "design-token/box-shadow": "error" }
}
```

Shadow tokens must be strings representing complete `box-shadow` declarations. Each declaration should include all required lengths and color values; no default units are assumed.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
```

### Valid

```css
.box { box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.box { box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2); }
```

## When Not To Use
If box shadows are not tokenized, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/border-radius](./border-radius.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
