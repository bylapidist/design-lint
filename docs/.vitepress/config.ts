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
                text: 'component-usage',
                link: '/rules/design-system/component-usage',
              },
              { text: 'deprecation', link: '/rules/design-system/deprecation' },
            ],
          },
          {
            text: 'Design Token',
            items: [
              { text: 'colors', link: '/rules/design-token/colors' },
              { text: 'line-height', link: '/rules/design-token/line-height' },
              { text: 'font-weight', link: '/rules/design-token/font-weight' },
              {
                text: 'letter-spacing',
                link: '/rules/design-token/letter-spacing',
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
              { text: 'duration', link: '/rules/design-token/duration' },
              { text: 'spacing', link: '/rules/design-token/spacing' },
              { text: 'font-size', link: '/rules/design-token/font-size' },
              { text: 'font-family', link: '/rules/design-token/font-family' },
              { text: 'z-index', link: '/rules/design-token/z-index' },
            ],
          },
        ],
      },
    ],
  },
});
