# design-token/border-radius

Enforces `border-radius` values to match the tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "borderRadius": { "sm": 2, "lg": "8px" }
  },
  "rules": { "design-token/border-radius": "error" }
}
```

Border radius tokens are defined under `tokens.borderRadius`. Numbers are treated as pixel values; strings may use `px`, `rem`, or `em` units.

## Examples

### Invalid

```css
.box { border-radius: 3px; }
```

### Valid

```css
.box { border-radius: 4px; }
.box { border-radius: md; }
```
