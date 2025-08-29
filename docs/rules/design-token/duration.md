# design-token/duration

Enforces transition and animation duration values to match the duration tokens defined in your configuration.

## Configuration

```json
{
  "tokens": {
    "durations": { "short": "100ms" },
    "motion": { "durations": { "long": 250 } }
  },
  "rules": { "design-token/duration": "error" }
}
```

Duration tokens may be numbers (milliseconds) or strings with `ms` or `s` units. String values are normalized for comparison. Tokens may also be provided under `tokens.motion.durations`.

## Examples

### Invalid

```css
.box { transition: all 300ms ease; }
.box { animation: fade 0.5s linear; }
```

### Valid

```css
.box { transition: all 100ms ease; }
.box { animation-duration: 250ms; }
```
