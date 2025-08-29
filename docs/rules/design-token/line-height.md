# design-token/line-height

Enforces `line-height` values to match the line-height tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "typography": { "lineHeights": { "base": 1.5, "tight": "20px" } }
  },
  "rules": { "design-token/line-height": "error" }
}
```

Line-height tokens may be numbers (unitless) or strings with `px`, `rem`, `em`, or `%` units. String values are normalized for comparison.

## Examples

### Invalid

```css
.text { line-height: 2; }
```

### Valid

```css
.text { line-height: 1.5; }
.text { line-height: 20px; }
```
