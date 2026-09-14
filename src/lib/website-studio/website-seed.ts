export type WebsiteSeed = {
  name:string;
  slug:string;
  prompt:string;
  brief:Record<string,unknown>;
  pages:Array<Record<string,unknown>>;
  designTokens:Record<string,unknown>;
  html:string;
  css:string;
  javascript:string;
};

export function slugifyWebsiteName(value:string):string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120) || 'website';
}

export function createWebsiteSeed(name:string,prompt:string):WebsiteSeed {
  const safeName=name.trim() || 'New Website';
  const slug=slugifyWebsiteName(safeName);
  const brief={
    goal:prompt.trim(),
    audience:'',
    brandVoice:'',
    conversionGoal:'',
    notes:'Generated as a starting structure; verify claims and replace placeholder content.',
  };
  const pages=[
    {name:'Home',path:'/',sections:['Hero','Benefits','Proof','CTA']},
    {name:'About',path:'/about',sections:['Story','Values','Team']},
    {name:'Contact',path:'/contact',sections:['Contact form','Details']},
  ];
  const designTokens={
    radius:'18px',
    spacing:'comfortable',
    typography:'modern sans',
    theme:'dark',
  };
  const html=`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeName}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="site-shell">
    <section class="hero">
      <p class="eyebrow">Built with Blackstar Website Studio</p>
      <h1>${safeName}</h1>
      <p class="lede">Describe your business, audience and goal in the Website Studio brief, then refine this starter into a production-ready site.</p>
      <a class="cta" href="#next">Start building</a>
    </section>
    <section id="next" class="panel">
      <h2>Website brief</h2>
      <p>${prompt.trim() || 'Add a website prompt to define the product, audience and desired outcome.'}</p>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>`;
  const css=`:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#f7f7fb;background:#07080d}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 70% 10%,#231052 0,transparent 35%),#07080d}
.site-shell{width:min(1120px,calc(100% - 32px));margin:auto;padding:96px 0}.hero,.panel{border:1px solid rgba(255,255,255,.1);background:rgba(12,13,22,.72);backdrop-filter:blur(18px);border-radius:24px;padding:clamp(28px,6vw,72px)}
.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:12px;color:#b8a4ff}.hero h1{font-size:clamp(42px,8vw,88px);line-height:.95;margin:16px 0}.lede{max-width:720px;color:#a7a7b3;font-size:18px;line-height:1.7}
.cta{display:inline-block;margin-top:20px;padding:12px 18px;border-radius:12px;background:white;color:black;text-decoration:none;font-weight:700}.panel{margin-top:24px;padding:32px}.panel p{color:#aaa;line-height:1.7}
@media(max-width:640px){.site-shell{padding:32px 0}.hero,.panel{border-radius:18px}}`;
  const javascript=`document.querySelectorAll('a[href^="#"]').forEach((link)=>link.addEventListener('click',(event)=>{const id=link.getAttribute('href');const target=id?document.querySelector(id):null;if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth'});}}));`;
  return {name:safeName,slug,prompt,brief,pages,designTokens,html,css,javascript};
}
