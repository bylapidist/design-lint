import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    fontSizes: {
      base: 16,
      xl: 24
    },
    fonts: {
      sans: 'Inter, sans-serif'
    }
  },
  rules: {
    'design-token/font-size': 'error',
    'design-token/font-family': 'warn'
  }
});
