import { normalizePagePath } from './website-pages';
export type WebsitePageDocument={
  name?:string;
  path?:string;
  title?:string;
  description?:string;
  html?:string;
  sections?:unknown[];
  status?:string;
};

export function pageOutputPath(path:string):string{
  const normalized=normalizePagePath(path);
  if(normalized==='/')return 'index.html';
  return normalized.replace(/^\//,'')+'/index.html';
}

export function buildFallbackPageHtml(siteName:string,page:WebsitePageDocument):string{
  const title=String(page.title||page.name||'Page');
  const description=String(page.description||'This page is ready to be designed in Blackstar Website Studio.');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} · ${siteName}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <main class="site-shell">
    <section class="panel">
      <p class="eyebrow">${siteName}</p>
      <h1>${title}</h1>
      <p>${description}</p>
      <p><a class="cta" href="/">Back to home</a></p>
    </section>
  </main>
  <script src="/script.js"></script>
</body>
</html>`;
}

export function resolvePageHtml(siteName:string,homeHtml:string,page:WebsitePageDocument):string{
  if(normalizePagePath(String(page.path||'/'))==='/')return homeHtml;
  const explicit=typeof page.html==='string'?page.html.trim():'';
  return explicit||buildFallbackPageHtml(siteName,page);
}

export function setPageHtml(pages:WebsitePageDocument[],path:string,html:string):WebsitePageDocument[]{
  return pages.map(page=>String(page.path||'/')===path?{...page,html}:page);
}
