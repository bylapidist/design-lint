# design-token/border-width

Enforces `border-width` values to match the border width tokens defined in your configuration.

## Configuration

```json
{
  "tokens": { "borderWidths": { "sm": 1, "md": 2 } },
  "rules": { "design-token/border-width": "error" }
}
```

Border width tokens may be defined under `tokens.borderWidths` or `tokens.borderWidth` and may be numbers or strings with `px`, `rem`, or `em` units.

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
