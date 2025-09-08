# Plugins

Plugins bundle custom rules for specific design systems. A plugin is a Node module that exports an object with a `rules` array.

## Architecture and naming

Plugin packages should be named `design-lint-plugin-<scope>` or `@scope/design-lint-plugin`. The package name forms the rule namespace: rules are referenced as `<plugin>/<rule>`.

```ts
// my-plugin/index.ts
export default {
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

```ts
export default {
  plugins: ['my-plugin'],
  rules: { 'my-plugin/no-raw-colors': 'error' }
};
```

Plugins resolve using standard Node module resolution and may be written in CommonJS or ESM. Declare `@lapidist/design-lint` as a `peerDependency` to ensure version compatibility with your plugin.

## Advanced example

The following plugin exposes multiple rules and accompanying tests.

```ts
// acme-plugin/index.ts
export default {
  rules: [
    {
      name: 'acme/no-raw-colors',
      meta: { description: 'disallow hex colors' },
      create(ctx) {
        return {
          Declaration(node) {
            // ...
          }
        };
      }
    },
    {
      name: 'acme/no-px',
      meta: { description: 'enforce tokens over px units' },
      create(ctx) {
        return {
          Declaration(node) {
            // ...
          }
        };
      }
    }
  ]
};
```

Tests run against the `Linter` API:

```ts
// test/acme-plugin.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter, FileSource } from '@lapidist/design-lint';
import plugin from '../index.js';

void test('reports raw colors and px units', async () => {
  const linter = new Linter({
    plugins: [plugin],
    rules: {
      'acme/no-raw-colors': 'error',
      'acme/no-px': 'warn'
    }
  }, new FileSource());
  const res = await linter.lintText('h1 { color: #fff; margin: 4px; }', 'file.css');
  assert.equal(res.messages.length, 2);
});
```

## Publishing to npm

- Build the plugin to a distributable format (CommonJS or ESM).
- Set the `name` field to follow the `design-lint-plugin-*` convention.
- Declare `@lapidist/design-lint` in `peerDependencies` to specify compatible versions.
- Run `npm publish --access public` to release.

## Debugging plugin load failures

If a plugin fails to load:

- Verify the package can be resolved with `node -p "require.resolve('my-plugin')"`.
- Confirm the module exports an object with a `rules` array.
- Ensure the plugin version matches the `peerDependency` range for `@lapidist/design-lint`.
- Use verbose logs (`DEBUG=design-lint*`) to inspect resolution issues.

## Documenting plugin options

Each rule may accept options. Define a JSON schema in `meta.schema` and document options in the plugin README:

```ts
{
  name: 'acme/no-raw-colors',
  meta: {
    description: 'disallow hex colors',
    schema: [{ type: 'object', properties: { allow: { type: 'array', items: { type: 'string' } } } }]
  },
  create(ctx) { /* ... */ }
}
```

## Best practices

- Prefix rule names with the plugin name to avoid collisions.
- Provide unit tests for each rule.
- Publish plugins to npm with clear documentation.
- Document all rule options and maintain `peerDependencies` for version compatibility.
