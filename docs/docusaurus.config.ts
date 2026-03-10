import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const config: Config = {
  title: 'Attaché',
  tagline: 'Turnkey AI agent platform powered by OpenClaw',

  url: 'https://attache.dev',
  baseUrl: '/',

  organizationName: 'Spantree',
  projectName: 'attache',

  // Cross-package links (e.g. /slides/) are only valid when all packages are
  // served together behind a reverse proxy. Use 'warn' so the docs build
  // succeeds in isolation without false "broken link" errors.
  onBrokenLinks: 'warn',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
      type: 'text/css',
      integrity: 'sha384-nB0miv6/jRmo5UCKBER6VNiTnMS1PbtAeG3l/eU3KCWK0Tp4MXIG5+VHyTPAA8T',
      crossorigin: 'anonymous',
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarCollapsed: false,
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Attaché',
      items: [
        {
          to: '/',
          label: 'Docs',
          position: 'left',
        },
        // TODO: Add slides link when slides component is enabled
        // { href: '/slides/', label: 'Slides', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Project',
          items: [
            {
              label: 'Docs',
              to: '/',
            },
            // TODO: Add slides link when slides component is enabled
            // { label: 'Slides', href: '/slides/' },
          ],
        },
        {
          title: 'Links',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Spantree/attache',
            },
            {
              label: 'OpenClaw',
              href: 'https://openclaw.ai',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Attaché.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
