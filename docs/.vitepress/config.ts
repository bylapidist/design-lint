import { defineConfig } from 'vitepress';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

function getRuleItems(dir: string) {
  return readdirSync(resolve(__dirname, dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const name = f.replace(/\.md$/, '');
      const section = dir.split('/').pop();
      return { text: name, link: `/rules/${section}/${name}` };
    })
    .sort((a, b) => a.text.localeCompare(b.text));
}

const designSystemRules = getRuleItems('../rules/design-system');
const designTokenRules = getRuleItems('../rules/design-token');

export default defineConfig({
  title: 'design-lint',
  description: 'Design system linter',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: 'https://design-lint.lapidist.net' },
  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local',
    },
    nav: [
      { text: 'GitHub', link: 'https://github.com/bylapidist/design-lint' },
      { text: 'Author', link: 'https://lapidist.net' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Usage', link: '/usage' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'API', link: '/api' },
          { text: 'Formatters', link: '/formatters' },
          { text: 'Plugins', link: '/plugins' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Frameworks', link: '/frameworks' },
          { text: 'CI', link: '/ci' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
        ],
      },
      {
        text: 'Rules',
        items: [
          { text: 'Design System', items: designSystemRules },
          { text: 'Design Token', items: designTokenRules },
        ],
      },
    ],
  },
});
