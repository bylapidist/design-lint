---
title: Migration from Style Dictionary
description: "Convert style-dictionary token builds to design-lint."
sidebar_position: 12
---

# Migration from Style Dictionary

Design systems often start with [Style Dictionary](https://amzn.github.io/style-dictionary/#/). design-lint focuses on linting and validation rather than bundled token builds, but you can reproduce common outputs with a small script.

## Before
A typical Style Dictionary setup transforms tokens into multiple outputs:

```js
// style-dictionary.config.js
module.exports = {
  source: ['tokens/**/*.json'],
  platforms: {
    css: { transformGroup: 'css', buildPath: 'dist/', files: [{ destination: 'tokens.css', format: 'css/variables' }] },
    js: { transformGroup: 'js', buildPath: 'dist/', files: [{ destination: 'tokens.js', format: 'javascript/es6' }] }
  }
};
```

## After
Define tokens in `designlint.config.ts` using DTIF-compliant documents. The configuration powers linting and drives the build script:

```ts
// designlint.config.ts
export default {
  tokens: { default: 'tokens/default.tokens.json' },
  nameTransform: 'kebab-case',
};
```

Create a Node script that loads the configuration and emits the desired artifacts:

```ts
// scripts/build-tokens.ts
import fs from 'node:fs';
import path from 'node:path';
import {
  loadConfig,
  generateCssVariables,
  generateJsConstants,
  generateTsDeclarations,
} from '@lapidist/design-lint';

const config = await loadConfig(process.cwd(), 'designlint.config.ts');
const tokensByTheme = config.tokens ?? {};

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(
  path.join('dist', 'tokens.css'),
  generateCssVariables(tokensByTheme, { nameTransform: config.nameTransform }),
);
fs.writeFileSync(
  path.join('dist', 'tokens.js'),
  generateJsConstants(tokensByTheme, { nameTransform: config.nameTransform }),
);
fs.writeFileSync(
  path.join('dist', 'tokens.d.ts'),
  generateTsDeclarations(tokensByTheme, { nameTransform: config.nameTransform }),
);
```

Add the script to `package.json`:

```json
{
  "scripts": {
    "build:tokens": "tsx scripts/build-tokens.ts"
  }
}
```

Run `npm run build:tokens` after linting to keep generated files up to date. This approach keeps the linting workflow lightweight while offering the same outputs produced by Style Dictionary.
