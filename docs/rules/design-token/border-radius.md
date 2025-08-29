# design-token/border-radius

Enforces `border-radius` values to match the radii tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "radii": { "sm": 2 },
    "borderRadius": { "lg": "8px" }
  },
  "rules": { "design-token/border-radius": "error" }
}
```

Radii tokens may be defined under `tokens.radii` or `tokens.borderRadius`. Numbers are treated as pixel values; strings may use `px`, `rem`, or `em` units.

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
