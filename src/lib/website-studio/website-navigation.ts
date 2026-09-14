import {normalizePagePath,normalizeWebsitePageSet} from './website-pages';

type NavPage={name?:string;path?:string;includeInNav?:boolean;navLabel?:string};

function escapeHtml(value:string):string{
  return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
}

export function buildWebsiteNavigation(pages:NavPage[],activePath:string):string{
  const safe=normalizeWebsitePageSet((Array.isArray(pages)?pages:[]).map(page=>({...page})));
  const active=normalizePagePath(activePath);
  const links=safe
    .filter(page=>page.includeInNav!==false)
    .map(page=>{
      const path=normalizePagePath(page.path||'/');
      const label=escapeHtml(String(page.navLabel||page.name||path));
      return `<a class="blackstar-site-nav__link" href="${path}"${path===active?' aria-current="page"':''}>${label}</a>`;
    })
    .join('\n      ');
  return `<!-- BLACKSTAR_NAV_START -->
<nav class="blackstar-site-nav" aria-label="Primary">
  <div class="blackstar-site-nav__inner">
      ${links}
  </div>
</nav>
<!-- BLACKSTAR_NAV_END -->`;
}

export function upsertWebsiteNavigation(html:string,pages:NavPage[],activePath:string):string{
  const block=buildWebsiteNavigation(pages,activePath);
  const source=String(html||'');
  const pattern=/<!-- BLACKSTAR_NAV_START -->[\s\S]*?<!-- BLACKSTAR_NAV_END -->/;
  if(pattern.test(source))return source.replace(pattern,block);
  if(/<body[^>]*>/i.test(source))return source.replace(/<body([^>]*)>/i,`<body$1>\n${block}`);
  return block+'\n'+source;
}

export function upsertWebsiteNavigationCss(css:string):string{
  const marker='/* BLACKSTAR_NAV_STYLES */';
  if(String(css||'').includes(marker))return String(css||'');
  return `${String(css||'').trim()}

${marker}
.blackstar-site-nav{position:sticky;top:0;z-index:50;border-bottom:1px solid rgba(255,255,255,.09);background:rgba(7,8,13,.82);backdrop-filter:blur(18px)}
.blackstar-site-nav__inner{width:min(1120px,calc(100% - 32px));margin:auto;display:flex;gap:8px;align-items:center;overflow-x:auto;padding:12px 0}
.blackstar-site-nav__link{display:inline-flex;white-space:nowrap;border-radius:10px;padding:8px 11px;color:inherit;text-decoration:none;opacity:.72}
.blackstar-site-nav__link:hover,.blackstar-site-nav__link[aria-current="page"]{background:rgba(255,255,255,.08);opacity:1}
@media (prefers-reduced-motion:reduce){.blackstar-site-nav__link{transition:none}}
`;
}
