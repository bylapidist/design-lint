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
    "$version": "1.0.0",
    "durations": {
      "short": {
        "$type": "duration",
        "$value": {
          "durationType": "css.transition-duration",
          "value": 0.1,
          "unit": "s"
        }
      },
      "long": { "$type": "duration", "$ref": "#/durations/short" }
    }
  },
  "rules": { "design-token/duration": "error" }
}
```

Duration tokens identify the timing context via `durationType` and provide a numeric `value`
with a corresponding `unit` such as `ms` or `s`.

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
