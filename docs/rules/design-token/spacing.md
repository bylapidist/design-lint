---
title: design-token/spacing
description: 'Use spacing tokens.'
---

# design-token/spacing

## Summary

Enforces a spacing scale so that only configured token values or multiples of a base unit are allowed.

## Configuration

Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "spacing": {
      "sm": { "$type": "dimension", "$value": { "value": 4, "unit": "px" } },
      "md": { "$type": "dimension", "$value": "{spacing.sm}" }
    }
  },
  "rules": {
    "design-token/spacing": ["error", { "base": 4, "units": ["rem", "vw"] }]
  }
}
```

Spacing tokens use the `dimension` type.

## Options

- `base` (`number`): values must be multiples of this number. Defaults to `4`.
- `units` (`string[]`): CSS units to validate. Defaults to `['px', 'rem', 'em']`.

Numbers that appear inside CSS functions (e.g., `calc()`, `var()`) are ignored.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box {
  margin: 5px;
}
```

### Valid

```css
.box {
  margin: 8px;
}
.box {
  margin: md;
}
.box {
  margin: calc(100% - 5px);
}
.box {
  margin: var(--space, 5px);
}
```

## When Not To Use

If spacing values do not follow a scale, disable this rule.

## Related Rules

- [design-token/colors](./colors.md)
- [design-token/font-size](./font-size.md)

## See also

- [Configuration](../../configuration.md)
- [Rule index](../index.md)
