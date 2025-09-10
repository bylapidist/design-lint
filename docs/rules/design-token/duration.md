---
title: design-token/duration
description: "Use duration tokens for transitions and animations."
---

# design-token/duration

## Summary
Enforces transition and animation duration values to match the duration tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "durations": {
      "$type": "duration",
      "short": { "$value": { "value": 100, "unit": "ms" } },
      "long": { "$value": { "value": 0.25, "unit": "s" } }
    }
  },
  "rules": { "design-token/duration": "error" }
}
```

Duration tokens use objects with a numeric `value` and a `unit` of `ms` or `s`.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { transition: all 300ms ease; }
.box { animation: fade 0.5s linear; }
```

### Valid

```css
.box { transition: all 100ms ease; }
.box { animation-duration: 250ms; }
```

## When Not To Use
If timing durations are not standardized, disable this rule.

## Related Rules
- [design-token/animation](./animation.md)
- [design-token/opacity](./opacity.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
