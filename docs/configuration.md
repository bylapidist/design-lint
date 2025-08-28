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

Design-lint searches for configuration starting from the current working
directory and walking up parent directories. In each directory it looks for
`designlint.config.js` first, then `designlint.config.json`. The first file
found is used.

If the discovered configuration file contains invalid JSON or JavaScript,
design-lint will throw an error including the file path and the underlying
syntax message.

## Fields

- `tokens`: Design token definitions such as colors, spacing and typography.
- `rules`: Map of rule name to severity or `[severity, options]`.
- `ignoreFiles`: Glob patterns to exclude from linting.
- `plugins`: Additional plugin packages to load.
