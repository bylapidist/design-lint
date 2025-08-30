# design-token/animation

Enforces `animation` values to match the animation tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "animations": { "spin": "spin 1s linear infinite" }
  },
  "rules": { "design-token/animation": "error" }
}
```

## Examples

### Invalid

```css
.box { animation: wiggle 2s ease-in-out; }
```

### Valid

```css
.box { animation: spin 1s linear infinite; }
```
