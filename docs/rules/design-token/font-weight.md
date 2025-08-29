# design-token/font-weight

Enforces `font-weight` values to match the font weight tokens defined in your configuration.

## Configuration

```json
{
  "tokens": { "fontWeights": { "regular": 400, "bold": "700", "emphasis": "bold" } },
  "rules": { "design-token/font-weight": "error" }
}
```

Font-weight tokens may be numbers or strings (e.g., `"bold"`). Numeric tokens allow equivalent numeric CSS values and JavaScript numeric literals.

## Examples

### Invalid

```css
.text { font-weight: 500; }
```

### Valid

```css
.text { font-weight: 400; }
.text { font-weight: bold; }
```
