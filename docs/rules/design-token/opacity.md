# design-token/opacity

## Summary
Enforces `opacity` values to match the opacity tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "opacity": { "low": 0.2, "high": 0.8 }
  },
  "rules": { "design-token/opacity": "error" }
}
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { opacity: 0.5; }
```

### Valid

```css
.box { opacity: 0.2; }
```

## When Not To Use
If opacity values are not standardized, disable this rule.

## Related Rules
- [design-token/colors](./colors.md)
- [design-token/duration](./duration.md)
