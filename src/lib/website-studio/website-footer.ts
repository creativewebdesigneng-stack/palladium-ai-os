import {normalizePagePath} from './website-pages';

export type WebsiteFooterConfig={
  brand?:string;
  text?:string;
  showNavigation?:boolean;
  copyright?:string;
};

function escapeHtml(value:string):string{
  return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
}

export function buildWebsiteFooter(config:WebsiteFooterConfig,pages:Array<{name?:string;path?:string;includeInNav?:boolean}>):string{
  const brand=escapeHtml(String(config.brand||''));
  const text=escapeHtml(String(config.text||''));
  const copyright=escapeHtml(String(config.copyright||''));
  const links=config.showNavigation===false?'':pages
    .filter(page=>page.includeInNav!==false)
    .map(page=>`<a href="${normalizePagePath(page.path||'/')}">${escapeHtml(String(page.name||page.path||'Page'))}</a>`)
    .join('');
  return `<!-- BLACKSTAR_FOOTER_START -->
<footer class="blackstar-site-footer">
  <div class="blackstar-site-footer__inner">
    <div><strong>${brand}</strong>${text?`<p>${text}</p>`:''}</div>
    ${links?`<nav aria-label="Footer">${links}</nav>`:''}
    ${copyright?`<small>${copyright}</small>`:''}
  </div>
</footer>
<!-- BLACKSTAR_FOOTER_END -->`;
}

export function upsertWebsiteFooter(html:string,config:WebsiteFooterConfig,pages:Array<{name?:string;path?:string;includeInNav?:boolean}>):string{
  const block=buildWebsiteFooter(config,pages);
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
.blackstar-site-footer{margin-top:64px;border-top:1px solid rgba(255,255,255,.09);padding:36px 0;color:inherit}
.blackstar-site-footer__inner{width:min(1120px,calc(100% - 32px));margin:auto;display:grid;gap:20px}
.blackstar-site-footer p,.blackstar-site-footer small{opacity:.65}
.blackstar-site-footer nav{display:flex;flex-wrap:wrap;gap:14px}
.blackstar-site-footer a{color:inherit;text-decoration:none;opacity:.72}
.blackstar-site-footer a:hover{opacity:1}
`;
}
