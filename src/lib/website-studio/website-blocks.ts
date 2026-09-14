export const WEBSITE_BLOCKS = [
  { id:'hero-centered', name:'Centered hero', category:'Hero', html:'<section class="hero-block"><p class="eyebrow">Your brand</p><h1>Build something memorable</h1><p>Clear value proposition and supporting copy.</p><a href="#cta">Get started</a></section>' },
  { id:'features-3', name:'Three features', category:'Content', html:'<section class="features-grid"><article><h3>Feature one</h3><p>Explain the benefit.</p></article><article><h3>Feature two</h3><p>Explain the benefit.</p></article><article><h3>Feature three</h3><p>Explain the benefit.</p></article></section>' },
  { id:'social-proof', name:'Social proof', category:'Trust', html:'<section class="proof-block"><h2>Trusted by customers</h2><p>Add verified testimonials, logos or metrics here.</p></section>' },
  { id:'pricing-3', name:'Three-tier pricing', category:'Commerce', html:'<section class="pricing-grid"><article><h3>Starter</h3><p>£0</p></article><article><h3>Growth</h3><p>£49</p></article><article><h3>Scale</h3><p>Contact us</p></article></section>' },
  { id:'faq', name:'FAQ', category:'Content', html:'<section class="faq-block"><h2>Frequently asked questions</h2><details><summary>Question one</summary><p>Answer.</p></details><details><summary>Question two</summary><p>Answer.</p></details></section>' },
  { id:'cta', name:'Call to action', category:'Conversion', html:'<section id="cta" class="cta-block"><h2>Ready to get started?</h2><a href="/contact">Contact us</a></section>' },
];

export function appendWebsiteBlock(html:string, blockId:string):string {
  const block=WEBSITE_BLOCKS.find((item)=>item.id===blockId);
  if(!block)return html;
  return html.includes('</main>') ? html.replace('</main>',`${block.html}\n</main>`) : `${html}\n${block.html}`;
}
