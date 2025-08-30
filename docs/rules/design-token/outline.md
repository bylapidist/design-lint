# design-token/outline

Enforces `outline` values to match the outline tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "outlines": { "focus": "2px solid #000" }
  },
  "rules": { "design-token/outline": "error" }
}
```

## Examples

### Invalid

```css
.box { outline: 3px solid #000; }
```

### Valid

```css
.box { outline: 2px solid #000; }
```
