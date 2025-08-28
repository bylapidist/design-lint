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

## Plugins

Plugins extend `design-lint` with additional rules. Each plugin must export an
object of the form `{ rules: RuleModule[] }`. For example:

```js
// my-plugin/index.js
module.exports = {
  rules: [
    {
      name: 'my-plugin/example',
      meta: { description: 'example rule' },
      create(context) {
        return {
          onNode(node) {
            /* ... */
          },
        };
      },
    },
  ],
};
```

Enable the plugin in your config and reference its rules by name:

```js
module.exports = {
  plugins: ['my-plugin'],
  rules: {
    'my-plugin/example': 'error',
  },
};
```

If a plugin cannot be resolved or does not export the expected shape, the
linter throws an error such as `Failed to load plugin "my-plugin"` or
`Invalid plugin "my-plugin": expected { rules: RuleModule[] }`.
