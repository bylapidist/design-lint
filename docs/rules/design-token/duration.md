---
title: design-token/duration
description: "Use duration tokens for transitions and animations."
---

# design-token/duration

## Summary
Enforces duration values in CSS transitions and animations — and numeric literals in TypeScript style objects — to match the duration tokens loaded into the DSR kernel.

Checked CSS properties: `transition`, `transition-duration`, `animation`, `animation-duration`.

Unit conversion: `s` values are converted to `ms` before matching, so a token of `0.1s` (100 ms) accepts `0.1s` or `100ms` in CSS.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/duration": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `duration`-type tokens under a `durations` group:

```json
{
  "$version": "1.0.0",
  "durations": {
    "long": {
      "$type": "duration",
      "$value": { "durationType": "css.transition-duration", "value": 0.3, "unit": "s" }
    },
    "short": {
      "$type": "duration",
      "$value": { "durationType": "css.transition-duration", "value": 0.1, "unit": "s" }
    }
  }
}
```

```bash
design-lint kernel start --config-path designlint.config.json
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

Given tokens `short` = 100 ms and `long` = 300 ms:

### Invalid

```css
/* 200ms does not match any token */
.box { transition: all 200ms ease; }
.box { animation: fade 0.5s linear; }
```

### Valid

```css
/* matches short token (100ms = 0.1s) */
.box { transition: all 100ms ease; }
.box { transition: all 0.1s ease; }
/* matches long token */
.box { animation-duration: 300ms; }
```

## When Not To Use
If timing durations are not standardized, disable this rule.

## Related Rules
- [design-token/animation](./animation.md)
- [design-token/opacity](./opacity.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
