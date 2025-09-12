---
title: Token Output Examples
description: "Generate CSS, JavaScript and TypeScript tokens with theme variants."
---

# Token Output Examples

This guide shows a minimal setup that writes CSS variables, JavaScript constants and TypeScript declarations from the same token sources.

## Example tokens

```jsonc
// tokens/default.tokens.json
{ "color": { "primary": { "$value": "#fff" } } }

// tokens/dark.tokens.json
{ "color": { "primary": { "$value": "#000" } } }
```

## Configuration

```ts
// designlint.config.ts
export default {
  tokens: {
    default: 'tokens/default.tokens.json',
    dark: 'tokens/dark.tokens.json',
  },
  output: [
    { format: 'css', file: 'dist/tokens.css' },
    { format: 'js', file: 'dist/tokens.js' },
    { format: 'ts', file: 'dist/tokens.d.ts' }
  ]
};
```

Run `npx design-lint generate` to produce all targets.

## Generated files

### CSS
```css
:root {
  --color-primary: #fff;
}
[data-theme='dark'] {
  --color-primary: #000;
}
```

### JavaScript
```js
export const COLOR_PRIMARY = '#fff';
export const COLOR_PRIMARY_DARK = '#000';
```

### TypeScript
```ts
export const tokens = {
  default: { color: { primary: '#fff' } },
  dark: { color: { primary: '#000' } }
} as const;
```
