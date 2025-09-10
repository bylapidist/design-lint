---
title: design-system/deprecation
description: 'Warn when using deprecated design system parts.'
---

# design-system/deprecation

## Summary

Flags tokens marked with `$deprecated`. If a deprecation message references another token using alias syntax, running the linter with `--fix` will substitute the suggested token.

## Configuration

Enable this rule in `designlint.config.*`. See [configuration](../../configuration.md) for details on configuring tokens and rules.

```json
{
  "tokens": {
    "color": {
      "old": {
        "$type": "color",
        "$value": "#000",
        "$deprecated": "Use {color.new}"
      },
      "new": { "$type": "color", "$value": "#fff" },
      "alias": { "$type": "color", "$value": "{color.new}" }
    }
  },
  "rules": { "design-system/deprecation": "error" }
}
```

## Options

No additional options.

_This rule is auto-fixable._

## Examples

### Invalid

```css
.button {
  color: colors.old;
}
```

```ts
const color = 'colors.old';
```

### Valid

```css
.button {
  color: colors.new;
}
```

```ts
const color = 'colors.new';
```

## When Not To Use

If you do not track deprecated tokens, disable this rule.

## Related Rules

- [design-system/component-prefix](./component-prefix.md)
- [design-system/component-usage](./component-usage.md)

## See also

- [Configuration](../../configuration.md)
- [Rule index](../index.md)
