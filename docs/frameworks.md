# Framework components

`@lapidist/design-lint` can lint components from various frameworks and technologies.

## React components

JSX and TSX files are linted so `style` props—whether specified as objects or
strings—can be checked against the configured rules.

```bash
npx design-lint src/App.tsx
```

## Vue single-file components

`.vue` files are parsed so both `<script>`/`<template>` code and `<style>` blocks
are linted. SCSS, Sass, and Less syntax inside `<style>` sections is supported
via each block's `lang` attribute.

```bash
npx design-lint src/components/App.vue
```

## Svelte components

When linting Svelte files, the linter understands both `style` attributes and
`style:` directives so each individual declaration is checked against the
configured rules. `<style>` blocks may also specify `lang="scss"`, `lang="sass"`,
or `lang="less"`.

```bash
npx design-lint src/App.svelte
```

## Tagged template literals

JavaScript and TypeScript files using tagged template literals are parsed so CSS
inside constructs like `styled.div\`color: red;\`` and `css\`...\`` or
`tw\`...\`` can be linted. Only static template strings without interpolated
expressions are analyzed. Use the `patterns` configuration field to include or
exclude JS/TS sources as needed.

## Web Components

Custom elements can be linted in `.html`, `.js`, or `.ts` files. Both inline
`style` attributes and `<style>` tags are parsed, including SCSS, Sass, and Less
syntax.

```bash
npx design-lint src/components/my-element.js
```
