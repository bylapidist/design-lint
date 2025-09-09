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
    "durations": { "short": "100ms", "long": 250 }
  },
  "rules": { "design-token/duration": "error" }
}
```

Duration tokens may be numbers (milliseconds) or strings with `ms` or `s` units. String values are normalized for comparison.

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
