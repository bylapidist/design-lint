# Configuration

Create a `designlint.config.js` (or `.json`) file in your project root:

```js
module.exports = {
  tokens: {
    colors: { primary: '#ff0000' },
    spacing: { sm: 4, md: 8 },
    typography: {
      fontSizes: { base: 16 },
      fonts: { sans: 'Inter, sans-serif' },
    },
  },
  rules: {
    'design-token/colors': 'error',
  },
};
```

## Fields

- `tokens`: Design token definitions such as colors, spacing and typography.
- `rules`: Map of rule name to severity or `[severity, options]`.
- `ignoreFiles`: Glob patterns to exclude from linting.
- `plugins`: Additional plugin packages to load.
