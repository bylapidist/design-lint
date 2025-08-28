# Writing Rule Plugins

Plugins let you extend `design-lint` with custom rules distributed as normal npm packages. A plugin exports an object with a `rules` array containing one or more `RuleModule` implementations.

## Step-by-step

1. **Create a new package**
   ```bash
   mkdir design-lint-plugin-example && cd design-lint-plugin-example
   npm init -y
   npm install design-lint
   ```
2. **Author a rule**
   ```ts
   // rules/no-hardcoded-colors.ts
   import type { RuleModule } from 'design-lint';

   export const noHardcodedColors: RuleModule = {
     name: 'plugin/no-hardcoded-colors',
     meta: { description: 'disallow colors outside the design tokens' },
     create(context) {
       const allowed = new Set(Object.values(context.tokens.colors || {}));
       return {
         onCSSDeclaration(decl) {
           if (!allowed.has(decl.value)) {
             context.report({
               message: `Unexpected color ${decl.value}`,
               line: decl.line,
               column: decl.column,
             });
           }
         },
       };
     },
   };
   ```
   This mirrors the built-in [`token-colors` rule](../src/rules/token-colors.ts) which checks CSS and string literals for non-token colours.
3. **Export the plugin**
   ```ts
   // index.ts
   import { noHardcodedColors } from './rules/no-hardcoded-colors';
   export const rules = [noHardcodedColors];
   ```
4. **Use the plugin** by listing it in `designlint.config.js`:
   ```js
   module.exports = {
     plugins: ['@org/design-lint-plugin-example'],
     rules: {
       '@org/design-lint-plugin-example/no-hardcoded-colors': 'error',
     },
   };
   ```
5. **Publish** the package to npm when ready:
   ```bash
   npm publish --access public
   ```

## Troubleshooting

- *Plugin not found*: ensure the package is installed and referenced in the `plugins` array.
- *Invalid plugin shape*: the default export must be an object like `{ rules: RuleModule[] }`.
- *Rule never runs*: confirm the rule `name` matches the key used in the configuration.

## API Reference

### RuleModule
```ts
interface RuleModule {
  name: string;
  meta: { description: string };
  create(context: RuleContext): RuleListener;
}
```

### RuleContext
```ts
interface RuleContext {
  report(msg): void;
  tokens: DesignTokens;
  options?: unknown;
  filePath: string;
}
```

### RuleListener
```ts
interface RuleListener {
  onNode?(node: ts.Node): void;
  onCSSDeclaration?(decl: CSSDeclaration): void;
}
```

### PluginModule
```ts
interface PluginModule {
  rules: RuleModule[];
}
```

For more examples, inspect the built-in rules such as [`component-usage`](../src/rules/component-usage.ts).

