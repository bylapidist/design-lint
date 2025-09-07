# design-token/animation

## Summary
Enforces `animation` values to match the animation tokens defined in your configuration.

## Configuration
Enable the rule in `designlint.config.*`. See [configuration](../../configuration.md) for defining tokens.

```json
{
  "tokens": {
    "animations": { "spin": "spin 1s linear infinite" }
  },
  "rules": { "design-token/animation": "error" }
}
```

## Options
No additional options.

This rule is not auto-fixable.

## Examples

### Invalid

```css
.box { animation: wiggle 2s ease-in-out; }
```

### Valid

```css
.box { animation: spin 1s linear infinite; }
```

## When Not To Use
If your project does not enforce animation tokens, disable this rule.

## Related Rules
- [design-token/duration](./duration.md)
- [design-token/colors](./colors.md)
