# design-token/letter-spacing

Enforces `letter-spacing` values to match the letter-spacing tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "letterSpacings": { "tight": "-0.05em", "loose": "0.1em" }
  },
  "rules": { "design-token/letter-spacing": "error" }
}
```

Letter-spacing tokens may be numbers (interpreted as `px`) or strings with `px`, `rem`, or `em` units. String values are normalized for comparison.

## Examples

### Invalid

```css
.text { letter-spacing: 2px; }
```

### Valid

```css
.text { letter-spacing: -0.05em; }
.text { letter-spacing: 0; }
```
