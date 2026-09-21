import { describe, expect, it } from 'vitest';
import {
  appendWebsiteBlock, createWebsiteBlockMarkup, deleteWebsiteBlock,
  duplicateWebsiteBlock, listWebsiteBlockInstances, moveWebsiteBlock,
} from './website-blocks';
import { setPageHtml } from './website-page-documents';

function example() {
  const a = createWebsiteBlockMarkup('hero-centered', 'hero-a');
  const b = createWebsiteBlockMarkup('cta', 'cta-b');
  return { a, b, html: '<main>Unmanaged header<!-- authored custom -->\n' + a + '\n<p data-owner="custom">KEEP EXACTLY</p>\n' + b + '\nUnmanaged footer</main>' };
}

describe('Website Studio managed components', () => {
  it('marks newly inserted visual library blocks without changing existing hand-written HTML', () => {
    const original = '<main><h1>Authored content</h1></main>';
    const next = appendWebsiteBlock(original, 'cta');
    const listed = listWebsiteBlockInstances(next);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.blockId).toBe('cta');
    expect(next).toContain('<h1>Authored content</h1>');
    expect(next).toContain('BLACKSTAR_BLOCK_START');
    expect(next.indexOf('BLACKSTAR_BLOCK_START')).toBeLessThan(next.indexOf('</main>'));
    expect(appendWebsiteBlock(original, 'nonexistent')).toBe(original);
  });

  it('lists distinct instances and preserves unmarked HTML during reorder', () => {
    const { html, a, b } = example();
    const entries = listWebsiteBlockInstances(html);
    expect(entries.map((item) => item.instanceId)).toEqual(['hero-a', 'cta-b']);
    const moved = moveWebsiteBlock(html, 'hero-a', 1);
    expect(listWebsiteBlockInstances(moved).map((item) => item.instanceId)).toEqual(['cta-b', 'hero-a']);
    expect(moved).toContain('<p data-owner="custom">KEEP EXACTLY</p>');
    expect(moved).toContain('Unmanaged header<!-- authored custom -->');
    expect(moved).toContain('Unmanaged footer</main>');
    expect(moved).toContain(a);
    expect(moved).toContain(b);
    expect(moveWebsiteBlock(html, 'hero-a', -1)).toBe(html);
    expect(moveWebsiteBlock(html, 'does-not-exist', 1)).toBe(html);
  });

  it('duplicates the currently edited body with a new ID, not the original template', () => {
    const { html } = example();
    const edited = html.replace('Build something memorable', 'A carefully edited heading');
    const duplicate = duplicateWebsiteBlock(edited, 'hero-a');
    const listed = listWebsiteBlockInstances(duplicate);
    expect(listed).toHaveLength(3);
    expect(listed[1]?.instanceId).not.toBe('hero-a');
    expect(listed[0]?.html).toContain('A carefully edited heading');
    expect(listed[1]?.html).toContain('A carefully edited heading');
    expect(duplicate).toContain('<p data-owner="custom">KEEP EXACTLY</p>');
    expect(duplicateWebsiteBlock(html, 'missing')).toBe(html);
  });

  it('deletes only the marked instance and leaves custom HTML and other instances alone', () => {
    const { html, b } = example();
    const next = deleteWebsiteBlock(html, 'hero-a');
    expect(listWebsiteBlockInstances(next).map((item) => item.instanceId)).toEqual(['cta-b']);
    expect(next).toContain(b);
    expect(next).toContain('<p data-owner="custom">KEEP EXACTLY</p>');
    expect(next).toContain('Unmanaged header');
    expect(deleteWebsiteBlock(html, 'unknown')).toBe(html);
  });

  it('isolates component edits to the chosen page instead of changing home and every route', () => {
    const { html } = example();
    const homeHtml = '<main>Home content</main>';
    const pages = [{ path: '/about', name: 'About', html }, { path: '/contact', name: 'Contact', html: '<main>Contact page</main>' }];
    const next = setPageHtml(pages, '/about', deleteWebsiteBlock(html, 'hero-a'));
    expect(homeHtml).toBe('<main>Home content</main>');
    expect(listWebsiteBlockInstances(next[0]?.html ?? '')).toHaveLength(1);
    expect(next[1]?.html).toBe('<main>Contact page</main>');
    expect(pages[0]?.html).toBe(html);
  });
});
