import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Blackstar public navigation contract', () => {
  it('does not ship placeholder hash links in the public navigation shell', () => {
    const nav = read('../../components/site/PublicNav.jsx');
    const footer = read('../../components/site/Footer.jsx');

    expect(nav).not.toContain('href="#"');
    expect(footer).not.toContain('href="#"');
  });

  it('does not publish invented support contact details or response-time promises', () => {
    const help = read('../../components/site/HelpShowcase.jsx');
    const helpPage = read('../../screens/HelpCentre.jsx');

    for (const unsupported of [
      'support@palladium.ai',
      '+44 20 0000 0000',
      'Average reply in under 4 hours',
      'Mon–Fri, 9am–6pm GMT',
      'Our support team and AI assistant are here 24/7',
      'Get instant answers, 24/7',
    ]) {
      expect(help + helpPage).not.toContain(unsupported);
    }
  });

  it('uses client-side routing for first-party public navigation', () => {
    const nav = read('../../components/site/PublicNav.jsx');

    expect(nav).toContain('<Link key={label} to={to}');
    expect(nav).not.toContain('<a key={label} href={href}');
  });

  it('keeps footer destinations on routes that Blackstar actually exposes', () => {
    const footer = read('../../components/site/Footer.jsx');
    const routeTree = read('../../routeTree.gen.ts');

    for (const path of [
      '/features',
      '/ai-agents',
      '/tools',
      '/business',
      '/pricing',
      '/developers',
      '/resources',
      '/mcp',
      '/help',
    ]) {
      expect(footer).toContain(`to: '${path}'`);
      expect(routeTree).toContain(`fullPath: '${path}'`);
    }

    expect(routeTree).toContain("fullPath: '/legal/$slug'");
  });
});
