export type WebsiteFooterLink={label:string;href:string};
export type WebsiteFooterConfig={
  brand?:string;
  tagline?:string;
  copyright?:string;
  legalLinks?:WebsiteFooterLink[];
  socialLinks?:WebsiteFooterLink[];
};

function escapeHtml(value:string):string{
  return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
}

function safeHref(value:string):string{
  const raw=String(value||'').trim();
  if(!raw)return '#';
  if(raw.startsWith('/')||raw.startsWith('#')||/^mailto:/i.test(raw)||/^tel:/i.test(raw))return raw;
  try{
    const url=new URL(raw);
    return ['http:','https:'].includes(url.protocol)?url.toString():'#';
  }catch{return '#'}
}

function renderLinks(links:WebsiteFooterLink[],className:string):string{
  return links.map(link=>`<a class="${className}" href="${escapeHtml(safeHref(link.href))}">${escapeHtml(link.label)}</a>`).join('\n        ');
}

export function buildWebsiteFooter(config:WebsiteFooterConfig):string{
  const legal=Array.isArray(config.legalLinks)?config.legalLinks:[];
  const social=Array.isArray(config.socialLinks)?config.socialLinks:[];
  const year=new Date().getUTCFullYear();
  const brand=escapeHtml(config.brand||'Website');
  const tagline=escapeHtml(config.tagline||'');
  const copyright=escapeHtml(config.copyright||`© ${year} ${config.brand||'Website'}`);
  return `<!-- BLACKSTAR_FOOTER_START -->
<footer class="blackstar-site-footer">
  <div class="blackstar-site-footer__inner">
    <div class="blackstar-site-footer__brand">
      <strong>${brand}</strong>
      ${tagline?`<p>${tagline}</p>`:''}
    </div>
    ${social.length?`<nav class="blackstar-site-footer__links" aria-label="Social links">
        ${renderLinks(social,'blackstar-site-footer__link')}
    </nav>`:''}
    ${legal.length?`<nav class="blackstar-site-footer__links" aria-label="Legal links">
        ${renderLinks(legal,'blackstar-site-footer__link')}
    </nav>`:''}
    <p class="blackstar-site-footer__copyright">${copyright}</p>
  </div>
</footer>
<!-- BLACKSTAR_FOOTER_END -->`;
}

export function upsertWebsiteFooter(html:string,config:WebsiteFooterConfig):string{
  const block=buildWebsiteFooter(config);
  const source=String(html||'');
  const pattern=/<!-- BLACKSTAR_FOOTER_START -->[\s\S]*?<!-- BLACKSTAR_FOOTER_END -->/;
  if(pattern.test(source))return source.replace(pattern,block);
  if(/<\/body>/i.test(source))return source.replace(/<\/body>/i,`${block}\n</body>`);
  return source+'\n'+block;
}

export function upsertWebsiteFooterCss(css:string):string{
  const marker='/* BLACKSTAR_FOOTER_STYLES */';
  if(String(css||'').includes(marker))return String(css||'');
  return `${String(css||'').trim()}

${marker}
.blackstar-site-footer{margin-top:clamp(48px,8vw,96px);border-top:1px solid rgba(255,255,255,.09);background:rgba(7,8,13,.72)}
.blackstar-site-footer__inner{width:min(1120px,calc(100% - 32px));margin:auto;display:grid;gap:18px;padding:32px 0}
.blackstar-site-footer__brand strong{font-size:14px}
.blackstar-site-footer__brand p,.blackstar-site-footer__copyright{margin:6px 0 0;color:rgba(255,255,255,.56);font-size:12px;line-height:1.6}
.blackstar-site-footer__links{display:flex;flex-wrap:wrap;gap:8px}
.blackstar-site-footer__link{border-radius:9px;padding:7px 9px;color:inherit;text-decoration:none;opacity:.68}
.blackstar-site-footer__link:hover{background:rgba(255,255,255,.07);opacity:1}
@media(min-width:760px){.blackstar-site-footer__inner{grid-template-columns:1.4fr 1fr 1fr;align-items:start}.blackstar-site-footer__copyright{grid-column:1/-1}}
@media(prefers-reduced-motion:reduce){.blackstar-site-footer__link{transition:none}}
`;
}
