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
  const block=WEBSITE_BLOCKS.find((item)=>item.id===blockId);
  if(!block)return html;
  return html.includes('</main>') ? html.replace('</main>',`${block.html}\n</main>`) : `${html}\n${block.html}`;
}
