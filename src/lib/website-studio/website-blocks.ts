export const WEBSITE_BLOCKS = [
  { id:'hero-centered', name:'Centered hero', category:'Hero', html:'<section class="hero-block"><p class="eyebrow">Your brand</p><h1>Build something memorable</h1><p>Clear value proposition and supporting copy.</p><a href="#cta">Get started</a></section>' },
  { id:'features-3', name:'Three features', category:'Content', html:'<section class="features-grid"><article><h3>Feature one</h3><p>Explain the benefit.</p></article><article><h3>Feature two</h3><p>Explain the benefit.</p></article><article><h3>Feature three</h3><p>Explain the benefit.</p></article></section>' },
  { id:'social-proof', name:'Social proof', category:'Trust', html:'<section class="proof-block"><h2>Trusted by customers</h2><p>Add verified testimonials, logos or metrics here.</p></section>' },
  { id:'pricing-3', name:'Three-tier pricing', category:'Commerce', html:'<section class="pricing-grid"><article><h3>Starter</h3><p>£0</p></article><article><h3>Growth</h3><p>£49</p></article><article><h3>Scale</h3><p>Contact us</p></article></section>' },
  { id:'faq', name:'FAQ', category:'Content', html:'<section class="faq-block"><h2>Frequently asked questions</h2><details><summary>Question one</summary><p>Answer.</p></details><details><summary>Question two</summary><p>Answer.</p></details></section>' },
  { id:'cta', name:'Call to action', category:'Conversion', html:'<section id="cta" class="cta-block"><h2>Ready to get started?</h2><a href="/contact">Contact us</a></section>' },
  { id:'auth-sign-in', name:'Email sign in', category:'App', html:'<section class="auth-block"><h2>Sign in</h2><form data-blackstar-auth="sign-in"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Password<input type="password" name="password" autocomplete="current-password" minlength="6" required></label><button type="submit">Sign in</button><p data-blackstar-auth-status role="status" aria-live="polite"></p></form></section>' },
  { id:'auth-sign-up', name:'Email sign up', category:'App', html:'<section class="auth-block"><h2>Create account</h2><form data-blackstar-auth="sign-up"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Password<input type="password" name="password" autocomplete="new-password" minlength="6" required></label><button type="submit">Create account</button><p data-blackstar-auth-status role="status" aria-live="polite"></p></form></section>' },
  { id:'auth-social', name:'Social & magic-link sign in', category:'App', html:'<section class="auth-block"><h2>Sign in another way</h2><form data-blackstar-auth="magic-link"><label>Email<input type="email" name="email" autocomplete="email" required></label><button type="submit">Email me a sign-in link</button><p data-blackstar-auth-status role="status" aria-live="polite"></p></form><div><button type="button" data-blackstar-auth-provider="google">Continue with Google</button><button type="button" data-blackstar-auth-provider="github">Continue with GitHub</button></div></section>' },
  { id:'auth-account', name:'Account actions', category:'App', html:'<section class="auth-block"><h2>Your account</h2><button type="button" data-blackstar-auth-signout>Sign out</button></section>' },
];

export function appendWebsiteBlock(html:string, blockId:string):string {
  const markup=createWebsiteBlockMarkup(blockId);
  if(!markup)return html;
  return html.includes('</main>') ? html.replace('</main>',`${markup}\n</main>`) : `${html}\n${markup}`;
}

/**
 * Managed visual components are delimited by exact Blackstar comments. Existing
 * hand-written HTML and AI-generated HTML without these markers remain intact
 * and are never silently adopted, reordered, duplicated or deleted.
 */
export type WebsiteBlockInstance = {
  instanceId: string;
  blockId: string;
  name: string;
  category: string;
  html: string;
};
type BlockSpan = WebsiteBlockInstance & { full: string; start: number; end: number };
const BLOCK_PATTERN = /<!-- BLACKSTAR_BLOCK_START id="([a-zA-Z0-9_-]+)" type="([a-zA-Z0-9_-]+)" -->\n?([\s\S]*?)\n?<!-- BLACKSTAR_BLOCK_END -->/g;
let instanceSequence = 0;
function newWebsiteBlockId(blockId: string): string {
  instanceSequence += 1;
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${instanceSequence.toString(36)}`;
  return `${blockId}-${id}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0,80);
}
function markedBlock(blockId: string, instanceId: string, body: string): string {
  return `<!-- BLACKSTAR_BLOCK_START id="${instanceId}" type="${blockId}" -->\n${body}\n<!-- BLACKSTAR_BLOCK_END -->`;
}
export function createWebsiteBlockMarkup(blockId: string, instanceId = newWebsiteBlockId(blockId)): string {
  const block = WEBSITE_BLOCKS.find((item) => item.id === blockId);
  if (!block || !/^[a-zA-Z0-9_-]{1,80}$/.test(instanceId)) return '';
  return markedBlock(block.id, instanceId, block.html);
}
function blockSpans(source: string): BlockSpan[] {
  const html = String(source ?? '');
  return [...html.matchAll(BLOCK_PATTERN)].map((match) => {
    const blockId = match[2] ?? '';
    const item = WEBSITE_BLOCKS.find((entry) => entry.id === blockId);
    const full = match[0];
    const start = match.index ?? 0;
    return {
      instanceId: match[1] ?? '',
      blockId,
      name: item?.name ?? blockId,
      category: item?.category ?? 'Custom',
      html: match[3] ?? '',
      full, start, end: start + full.length,
    };
  });
}
export function listWebsiteBlockInstances(html: string): WebsiteBlockInstance[] {
  return blockSpans(html).map(({ instanceId, blockId, name, category, html: content }) => ({
    instanceId, blockId, name, category, html: content,
  }));
}
export function deleteWebsiteBlock(html: string, instanceId: string): string {
  const source = String(html ?? '');
  const target = blockSpans(source).find((item) => item.instanceId === instanceId);
  return target ? source.slice(0, target.start) + source.slice(target.end) : source;
}
export function moveWebsiteBlock(html: string, instanceId: string, direction: -1 | 1): string {
  const source = String(html ?? '');
  const blocks = blockSpans(source);
  const index = blocks.findIndex((item) => item.instanceId === instanceId);
  const other = index + direction;
  if (index < 0 || other < 0 || other >= blocks.length) return source;
  const current = blocks[index]!;
  const neighbour = blocks[other]!;
  if (direction === 1) {
    const unchanged = source.slice(current.end, neighbour.start);
    return source.slice(0, current.start) + neighbour.full + unchanged + current.full + source.slice(neighbour.end);
  }
  const unchanged = source.slice(neighbour.end, current.start);
  return source.slice(0, neighbour.start) + current.full + unchanged + neighbour.full + source.slice(current.end);
}
export function duplicateWebsiteBlock(html: string, instanceId: string): string {
  const source = String(html ?? '');
  const target = blockSpans(source).find((item) => item.instanceId === instanceId);
  if (!target) return source;
  // Copy the user's currently edited block body, not the pristine template.
  let duplicateId = newWebsiteBlockId(target.blockId);
  for (let attempt = 0; attempt < 10 && source.includes(`id="${duplicateId}"`); attempt += 1) {
    duplicateId = newWebsiteBlockId(target.blockId);
  }
  if (source.includes(`id="${duplicateId}"`)) return source;
  const copy = markedBlock(target.blockId, duplicateId, target.html);
  return source.slice(0, target.end) + '\n' + copy + source.slice(target.end);
}
