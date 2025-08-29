export default {
  title: 'design-lint',
  description: 'Design system linter',
  themeConfig: {
    nav: [
      { text: 'Usage', link: '/usage' },
      { text: 'Configuration', link: '/configuration' },
      { text: 'API', link: '/api' },
      { text: 'Plugins', link: '/plugins' },
      { text: 'Rules', link: '/rules/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Usage', link: '/usage' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'API', link: '/api' },
          { text: 'Plugins', link: '/plugins' }
        ]
      },
      {
        text: 'Rules',
        items: [
          {
            text: 'Design System',
            items: [
              { text: 'component-usage', link: '/rules/design-system/component-usage' },
              { text: 'deprecation', link: '/rules/design-system/deprecation' }
            ]
          },
          {
            text: 'Design Token',
            items: [
              { text: 'colors', link: '/rules/design-token/colors' },
              { text: 'typography', link: '/rules/design-token/typography' },
              { text: 'spacing', link: '/rules/design-token/spacing' }
            ]
          }
        ]
      }
    ]
  }
};
