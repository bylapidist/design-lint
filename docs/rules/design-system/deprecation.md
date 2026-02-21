---
title: design-system/deprecation
description: "Warn when using deprecated design system parts."
---

# design-system/deprecation

## Summary
Flags tokens marked with `$deprecated`. When a deprecated token is used as a string literal token path (for example `"colors.old"`), running the linter with `--fix` can substitute the suggested token. CSS declaration values are reported but are not currently auto-fixed.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "tokens": {
    "$version": "1.0.0",
    "color": {
      "old": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0, 0]
        },
        "$deprecated": { "$replacement": "#/color/new" }
      },
      "new": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [1, 1, 1]
        }
      },
      "alias": { "$type": "color", "$ref": "#/color/new" }
    }
  },
  "rules": { "design-system/deprecation": "error" }
}
```

## Options
No additional options.

*This rule is partially auto-fixable (string literal token paths only).*

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
