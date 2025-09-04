import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    base: { colors: { primary: '#000000' } },
    light: { colors: { primary: '#ffffff' } },
    dark: { colors: { primary: '#000000' } }
  },
  rules: {
    'design-token/colors': ['error', { themes: ['light', 'dark'] }]
  }
});
