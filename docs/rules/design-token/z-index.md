---
title: design-token/z-index
description: "Use z-index tokens."
---

# design-token/z-index

## Summary
Enforces `z-index` values to match the `zIndex` tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "zIndex": {
      "$type": "number",
      "modal": { "$value": 1000 },
      "dropdown": { "$value": 2000 }
    }
  },
  "rules": { "design-token/z-index": "error" }
}
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.layer { z-index: 5; }
```

```ts
const layer = 5;
```

### Valid

```css
.layer { z-index: 1000; }
```

```ts
const layer = 1000;
```

## When Not To Use
If z-index values are not standardized, disable this rule.

## Related Rules
- [design-token/opacity](./opacity.md)
- [design-token/spacing](./spacing.md)

## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
