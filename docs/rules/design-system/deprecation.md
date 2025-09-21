---
title: design-system/deprecation
description: "Warn when using deprecated design system parts."
---

# design-system/deprecation

## Summary
Flags tokens marked with `$deprecated`. If a deprecation message references another token using a JSON Pointer, running the linter with `--fix` will substitute the suggested token.

## Configuration
Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "tokens": {
    "color": {
      "old": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [0, 0, 0] },
        "$deprecated": {
          "$message": "Use the new brand color",
          "$replacement": "#/color/new"
        }
      },
      "new": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [1, 1, 1] }
      },
      "alias": { "$ref": "#/color/new" }
    }
  },
  "rules": { "design-system/deprecation": "error" }
}
```

Use canonical JSON Pointers (e.g. `#/color/new`) in `$deprecated.$replacement` so that auto-fixes resolve the correct token.

## Options
No additional options.

*This rule is auto-fixable.*

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
