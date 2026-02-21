---
title: Plugin Authoring Example
description: "Build and test a simple design-lint plugin."
---

# Plugin Authoring Example

Start a new plugin that exposes one rule.

## Steps
1. Scaffold the project:
   ```bash
   npm init -y
   npm install --save-dev @lapidist/design-lint typescript
   ```
2. Create `index.ts` with a rule:
   ```ts
   export default {
     rules: [{ name: 'demo/no-raw-colors', create: () => ({}) }]
   };
   ```
3. Test it:
   ```ts
   import { createLinter, createNodeEnvironment } from '@lapidist/design-lint';
   import plugin from './index.js';
   const config = { plugins: [plugin], rules: { 'demo/no-raw-colors': 'error' } };
   const linter = createLinter(config, createNodeEnvironment(config));
   ```

## Next steps
Read the [plugins guide](../../plugins.md) for a full tutorial.
