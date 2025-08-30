# design-token/border-width

Enforces `border-width` values to match the border width tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "borderWidths": { "sm": 1, "lg": "4px" }
  },
  "rules": { "design-token/border-width": "error" }
}
```

Border width tokens are defined under `tokens.borderWidths`. Numbers are treated as pixel values; strings may use `px`, `rem`, or `em` units.

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
