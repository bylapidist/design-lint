# design-token/blur

## Summary
Enforces `blur()` values in `filter` or `backdrop-filter` to match the blur tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "blurs": { "sm": "4px" }
  },
  "rules": { "design-token/blur": "error" }
}
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { filter: blur(2px); }
```

### Valid

```css
.box { filter: blur(4px); }
```

## When Not To Use
If enforcing blur tokens is unnecessary, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/spacing](./spacing.md)
