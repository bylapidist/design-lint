---
title: Migration from Style Dictionary
description: "Convert style-dictionary token builds to design-lint."
sidebar_position: 12
---

# Migration from Style Dictionary

Design systems often start with [Style Dictionary](https://amzn.github.io/style-dictionary/#/). The `generate` command in design-lint provides a similar token build pipeline while adhering strictly to the Design Token Interchange Format (DTIF).

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
The equivalent design-lint configuration loads the same sources and declares output targets. design-lint resolves aliases, flattens tokens and writes each target with a single command:

```ts
// designlint.config.ts
export default {
  tokens: { default: 'tokens/default.tokens.json' },
  output: [
    { format: 'css', file: 'dist/tokens.css' },
    { format: 'js', file: 'dist/tokens.js' },
    { format: 'ts', file: 'dist/tokens.d.ts' }
  ]
};
```

Run the build:

```bash
npx design-lint generate
```

design-lint emits CSS variables, JavaScript constants and TypeScript declarations without custom transforms. Theme variants and naming transforms can be added incrementally as needed.
