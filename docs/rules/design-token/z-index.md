---
title: design-token/z-index
description: "Use z-index tokens."
---

# design-token/z-index

## Summary
Enforces `z-index` values to match the `zIndex` tokens loaded into the DSR kernel.

## Configuration
Enable the rule in `designlint.config.*`:

```json
{ "rules": { "design-token/z-index": "error" } }
```

Tokens are not configured inline. Seed the DSR kernel from a DTIF catalog that includes `number`-type tokens under a `zIndex` group:

```json
{
  "$version": "1.0.0",
  "zIndex": {
    "modal": { "$type": "number", "$value": 1000 },
    "dropdown": { "$type": "number", "$ref": "#/zIndex/modal" }
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
