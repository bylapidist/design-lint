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

const guideSidebar = [
  {
    text: 'Get started',
    items: [
      { text: 'Usage', link: '/usage' },
      { text: 'Configuration', link: '/configuration' },
      { text: 'Migration', link: '/migration' },
      { text: 'Frameworks', link: '/frameworks' },
      { text: 'CI integration', link: '/ci' },
      { text: 'Troubleshooting', link: '/troubleshooting' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'API', link: '/api' },
      { text: 'Formatters', link: '/formatters' },
      { text: 'Plugins', link: '/plugins' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Glossary', link: '/glossary' },
      { text: 'Changelog guide', link: '/changelog-guide' },
    ],
  },
];

const rulesSidebar = [
  {
    text: 'Rules',
    items: [{ text: 'Overview', link: '/rules/' }],
  },
  {
    text: 'Design System',
    items: designSystemRules,
  },
  {
    text: 'Design Token',
    items: designTokenRules,
  },
];

const examplesSidebar = [
  {
    text: 'Examples',
    items: [
      { text: 'Overview', link: '/examples/index' },
      { text: 'Basic project', link: '/examples/basic/' },
      { text: 'React', link: '/examples/react/' },
      { text: 'Vue', link: '/examples/vue/' },
      { text: 'Plugin authoring', link: '/examples/plugin/' },
      { text: 'Custom formatter', link: '/examples/formatter/' },
    ],
  },
];

export default defineConfig({
  title: 'design-lint',
  description: 'Design system linter',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: 'https://design-lint.lapidist.net' },
  themeConfig: {
    logo: '/logo.svg',
    outline: { level: [2, 3], label: 'On this page' },
    search: {
      provider: 'local',
    },
    nav: [
      {
        text: 'Guide',
        link: '/usage',
        activeMatch: '^/(usage|configuration|migration|frameworks|ci|troubleshooting)$',
      },
      { text: 'Rules', link: '/rules/', activeMatch: '^/rules/' },
      { text: 'Examples', link: '/examples/', activeMatch: '^/examples/' },
      {
        text: 'Reference',
        activeMatch: '^/(api|formatters|plugins|architecture|glossary|changelog-guide)',
        items: [
          { text: 'API', link: '/api' },
          { text: 'Formatters', link: '/formatters' },
          { text: 'Plugins', link: '/plugins' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Glossary', link: '/glossary' },
          { text: 'Changelog guide', link: '/changelog-guide' },
        ],
      },
      { text: 'GitHub', link: 'https://github.com/bylapidist/design-lint' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/bylapidist/design-lint' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/company/lapidist' },
    ],
    sidebar: {
      '/rules/': rulesSidebar,
      '/examples/': examplesSidebar,
      '/': guideSidebar,
    },
    editLink: {
      pattern: 'https://github.com/bylapidist/design-lint/edit/main/docs/:path',
      text: 'Edit this page',
    },
    lastUpdatedText: 'Last updated',
    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present Lapidist',
    },
  },
  markdown: {
    headers: {
      level: [2, 3, 4],
    },
  },
});
