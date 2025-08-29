# design-token/z-index

Enforces `z-index` values to match the `zIndex` tokens defined in your configuration.

## Configuration

```json
{
  "tokens": { "zIndex": { "modal": 1000, "dropdown": 2000 } },
  "rules": { "design-token/z-index": "error" }
}
```

## Examples

### Invalid

```css
.layer { z-index: 5; }
```

```ts
const layer = 5;
```

### Valid

```css
.layer { z-index: 1000; }
```

```ts
const layer = 1000;
```
