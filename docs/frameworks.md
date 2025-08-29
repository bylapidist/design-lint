# Framework components

`@lapidist/design-lint` can lint components from various frameworks and technologies.

## React components

JSX and TSX files are linted so `style` props can be checked against the configured rules.

```bash
npx design-lint src/App.tsx
```

## Vue single-file components

`.vue` files are parsed so both `<script>`/`<template>` code and `<style>` blocks are linted. Only standard CSS is supported in `<style>` sections; preprocessors such as Sass or Less must be compiled beforehand.

```bash
npx design-lint src/components/App.vue
```

## Svelte components

When linting Svelte files, the linter understands both `style` attributes and `style:` directives so each individual declaration is checked against the configured rules.

```bash
npx design-lint src/App.svelte
```

## Web Components

Custom elements can be linted in `.html`, `.js`, or `.ts` files. Both inline `style` attributes and `<style>` tags are parsed using standard CSS; preprocessors must be compiled ahead of time.

```bash
npx design-lint src/components/my-element.js
```
