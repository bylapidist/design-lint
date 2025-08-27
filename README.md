# design-lint

`design-lint` is a pluggable linter for enforcing design system rules in codebases. It checks tokens and component usage across JavaScript/TypeScript and CSS files.

## Usage

```sh
npx design-lint .
```

Configure via `designlint.config.js` (or `.json`):

```js
module.exports = {
  tokens: {
    colors: { primary: '#ff0000' },
    spacing: { sm: 4 },
    typography: {
      fontSizes: { base: 16 },
      fonts: { sans: 'Inter, sans-serif' },
    },
  },
  rules: { 'design-token/colors': 'error' },
};
```

Full documentation is available in the [docs](docs/usage.md) directory.

## Features
- Enforce color, spacing, and typography tokens
- Prevent deprecated or raw HTML component usage
- Pluggable rule and formatter architecture
- JSON and SARIF output for CI

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
