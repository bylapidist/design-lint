---
title: design-system/deprecation
description: "Warn when using deprecated design system parts."
---

# design-system/deprecation

## Summary
Flags tokens whose DTIF metadata includes a `deprecated` entry. Reports usages in string literal token paths (for example `"colors.old"`) and CSS declaration values.

## Configuration
Enable this rule in `designlint.config.*`:

```json
{ "rules": { "design-system/deprecation": "error" } }
```

Deprecation metadata is read from the DSR kernel. Seed the kernel from a DTIF catalog that marks tokens with `$deprecated`:

```json
{
  "$version": "1.0.0",
  "color": {
    "old": {
      "$type": "color",
      "$value": { "colorSpace": "srgb", "components": [0, 0, 0] },
      "$deprecated": { "$replacement": "#/color/new" }
    },
    "new": {
      "$type": "color",
      "$value": { "colorSpace": "srgb", "components": [1, 1, 1] }
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

### Invalid

```css
.button { color: colors.old; }
```

```ts
const color = "colors.old";
```

### Valid

```css
.button { color: colors.new; }
```

```ts
const color = "colors.new";
```

## When Not To Use
If you do not track deprecated tokens, disable this rule.

## Related Rules
- [design-system/component-prefix](./component-prefix.md)
- [design-system/component-usage](./component-usage.md)


## See also
- [Configuration](../../configuration.md)
- [Rule index](../index.md)
