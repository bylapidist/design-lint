---
title: React Example
description: 'Integrate design-lint with a React project.'
---

# React Example

Demonstrates linting React components.

## Steps

1. Install dependencies:
   ```bash
   npm install --save-dev @lapidist/design-lint
   ```
2. Create `designlint.config.json` enabling React-specific rules:
   ```json
   {
     "rules": { "design-system/component-usage": "warn" }
   }
   ```
3. Lint files:
   ```bash
   npx design-lint "src/**/*.{ts,tsx}"
   ```

## Next steps

See [framework integrations](../../frameworks.md#react) for more guidance.
