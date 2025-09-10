---
title: Custom Formatter Example
description: 'Create and use a custom formatter.'
---

# Custom Formatter Example

Outputs only file names that contain lint errors.

## Steps

1. Create `formatter.js`:
   ```js
   export default function formatter(results) {
     return results.map((r) => r.sourceId).join('\n');
   }
   ```
2. Run design-lint with the formatter:
   ```bash
   npx design-lint "src/**/*" --format ./formatter.js
   ```

## Next steps

See [formatters](../../formatters.md) for more information.
