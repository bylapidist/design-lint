import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'design-lint',
  description: 'Design system linter',
  themeConfig: {
    nav: [
      { text: 'Usage', link: '/usage' },
      { text: 'Configuration', link: '/configuration' },
      { text: 'API', link: '/api' },
      { text: 'Plugins', link: '/plugins' },
      { text: 'Rules', link: '/rules/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Usage', link: '/usage' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'API', link: '/api' },
          { text: 'Plugins', link: '/plugins' },
        ],
      },
      {
        text: 'Rules',
        items: [
          {
            text: 'Design System',
            items: [
              {
                text: 'component-prefix',
                link: '/rules/design-system/component-prefix',
              },
              {
                text: 'component-usage',
                link: '/rules/design-system/component-usage',
              },
              { text: 'deprecation', link: '/rules/design-system/deprecation' },
              { text: 'icon-usage', link: '/rules/design-system/icon-usage' },
              { text: 'import-path', link: '/rules/design-system/import-path' },
              {
                text: 'no-inline-styles',
                link: '/rules/design-system/no-inline-styles',
              },
              {
                text: 'variant-prop',
                link: '/rules/design-system/variant-prop',
              },
            ],
          },
          {
            text: 'Design Token',
            items: [
              { text: 'animation', link: '/rules/design-token/animation' },
              { text: 'blur', link: '/rules/design-token/blur' },
              {
                text: 'border-color',
                link: '/rules/design-token/border-color',
              },
              {
                text: 'border-radius',
                link: '/rules/design-token/border-radius',
              },
              {
                text: 'border-width',
                link: '/rules/design-token/border-width',
              },
              { text: 'box-shadow', link: '/rules/design-token/box-shadow' },
              { text: 'colors', link: '/rules/design-token/colors' },
              { text: 'duration', link: '/rules/design-token/duration' },
              { text: 'font-family', link: '/rules/design-token/font-family' },
              { text: 'font-size', link: '/rules/design-token/font-size' },
              { text: 'font-weight', link: '/rules/design-token/font-weight' },
              {
                text: 'letter-spacing',
                link: '/rules/design-token/letter-spacing',
              },
              { text: 'line-height', link: '/rules/design-token/line-height' },
              { text: 'opacity', link: '/rules/design-token/opacity' },
              { text: 'outline', link: '/rules/design-token/outline' },
              { text: 'spacing', link: '/rules/design-token/spacing' },
              { text: 'z-index', link: '/rules/design-token/z-index' },
            ],
          },
        ],
      },
    ],
  },
});
