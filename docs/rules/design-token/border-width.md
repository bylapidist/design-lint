---
title: design-token/border-width
description: 'Enforce use of border width tokens.'
---

# design-token/border-width

## Summary

Enforces `border-width` values to match the border width tokens defined in your configuration.

## Configuration

Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "borderWidths": {
      "sm": { "$type": "dimension", "$value": { "value": 1, "unit": "px" } },
      "lg": { "$type": "dimension", "$value": "{borderWidths.sm}" }
    }
  },
  "rules": { "design-token/border-width": "error" }
}
```

Border width tokens use the `dimension` type.

## Options

No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box {
  border-width: 3px;
}
```

### Valid

```css
.box {
  border-width: 1px;
}
.box {
  border-width: sm;
}
```

## When Not To Use

If border widths are not standardized with tokens, disable this rule.

## Related Rules

- [design-token/border-radius](./border-radius.md)
- [design-token/colors](./colors.md)

## See also

- [Configuration](../../configuration.md)
- [Rule index](../index.md)
