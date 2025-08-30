# design-token/border-color

Enforces `border-color` values to match the border color tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "borderColors": { "primary": "#ffffff" }
  },
  "rules": { "design-token/border-color": "error" }
}
```

## Examples

### Invalid

```css
.box { border-color: #000000; }
```

### Valid

```css
.box { border-color: #ffffff; }
```
