# design-token/border-width

## Summary
Enforces `border-width` values to match the border width tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "borderWidths": { "sm": 1, "lg": "4px" }
  },
  "rules": { "design-token/border-width": "error" }
}
```

Border width tokens are defined under `tokens.borderWidths`. Numbers are treated as pixel values; strings may use `px`, `rem`, or `em` units.

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { border-width: 3px; }
```

### Valid

```css
.box { border-width: 1px; }
.box { border-width: sm; }
```

## When Not To Use
If border widths are not standardized with tokens, disable this rule.

## Related Rules
- [design-token/border-radius](./border-radius.md)
- [design-token/colors](./colors.md)
