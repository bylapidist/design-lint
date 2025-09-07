# Plugins

Plugins bundle custom rules for specific design systems. A plugin exports an object with a `rules` array:

```js
// my-plugin/index.js
module.exports = {
  rules: [
    {
      name: 'my-plugin/no-raw-colors',
      meta: { description: 'disallow hex colors' },
      create(context) {
        return {
          Declaration(node) {
            // report violations
          }
        };
      }
    }
  ]
};
```

Enable plugins in your configuration:

```js
module.exports = {
  plugins: ['my-plugin'],
  rules: { 'my-plugin/no-raw-colors': 'error' }
};
```

Plugins are resolved using Node module resolution. Both CommonJS and ES modules are supported.

## Best practices

- Prefix rule names with the plugin name to avoid collisions.
- Provide unit tests for each rule.
- Publish plugins to npm with clear documentation.
