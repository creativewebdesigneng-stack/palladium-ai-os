export const WEBSITE_BLOCKS = [
  { id:'hero-centered', name:'Centered hero', category:'Hero', html:'<section class="hero-block"><p class="eyebrow">Your brand</p><h1>Build something memorable</h1><p>Clear value proposition and supporting copy.</p><a href="#cta">Get started</a></section>' },
  { id:'features-3', name:'Three features', category:'Content', html:'<section class="features-grid"><article><h3>Feature one</h3><p>Explain the benefit.</p></article><article><h3>Feature two</h3><p>Explain the benefit.</p></article><article><h3>Feature three</h3><p>Explain the benefit.</p></article></section>' },
  { id:'social-proof', name:'Social proof', category:'Trust', html:'<section class="proof-block"><h2>Trusted by customers</h2><p>Add verified testimonials, logos or metrics here.</p></section>' },
  { id:'pricing-3', name:'Three-tier pricing', category:'Commerce', html:'<section class="pricing-grid"><article><h3>Starter</h3><p>£0</p></article><article><h3>Growth</h3><p>£49</p></article><article><h3>Scale</h3><p>Contact us</p></article></section>' },
  { id:'faq', name:'FAQ', category:'Content', html:'<section class="faq-block"><h2>Frequently asked questions</h2><details><summary>Question one</summary><p>Answer.</p></details><details><summary>Question two</summary><p>Answer.</p></details></section>' },
  { id:'cta', name:'Call to action', category:'Conversion', html:'<section id="cta" class="cta-block"><h2>Ready to get started?</h2><a href="/contact">Contact us</a></section>' },
];

export type WebsiteBlockInstance={instanceId:string;blockId:string;name:string;category:string;html:string};

const START='<!-- BLACKSTAR_BLOCK_START ';
const END='<!-- BLACKSTAR_BLOCK_END -->';
const BLOCK_PATTERN=/<!-- BLACKSTAR_BLOCK_START id="([a-zA-Z0-9_-]+)" type="([a-zA-Z0-9_-]+)" -->\n?([\s\S]*?)\n?<!-- BLACKSTAR_BLOCK_END -->/g;

function safeInstanceId(value:string):string{
  return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'block';
}

function newInstanceId(blockId:string):string{
  const uuid=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  return safeInstanceId(`${blockId}-${uuid}`);
}

export function createWebsiteBlockMarkup(blockId:string,instanceId=newInstanceId(blockId)):string{
  const block=WEBSITE_BLOCKS.find(item=>item.id===blockId);
  if(!block)return '';
  const id=safeInstanceId(instanceId);
  return `${START}id="${id}" type="${block.id}" -->\n${block.html}\n${END}`;
}

export function appendWebsiteBlock(html:string,blockId:string):string{
  const markup=createWebsiteBlockMarkup(blockId);
  if(!markup)return html;
  return html.includes('</main>')?html.replace('</main>',`${markup}\n</main>`):`${html}\n${markup}`;
}

export function listWebsiteBlockInstances(html:string):WebsiteBlockInstance[]{
  const result:WebsiteBlockInstance[]=[];
  for(const match of String(html||'').matchAll(BLOCK_PATTERN)){
    const block=WEBSITE_BLOCKS.find(item=>item.id===match[2]);
    result.push({
      instanceId:match[1]!,
      blockId:match[2]!,
      name:block?.name||match[2]!,
      category:block?.category||'Custom',
      html:match[3]||'',
    });
  }
  return result;
}

function replaceMarkedBlocks(html:string,transform:(items:Array<{full:string;instanceId:string;blockId:string;body:string}>)=>Array<{full:string;instanceId:string;blockId:string;body:string}>):string{
  const source=String(html||'');
  const items=[...source.matchAll(BLOCK_PATTERN)].map(match=>({full:match[0],instanceId:match[1]!,blockId:match[2]!,body:match[3]||''}));
  if(!items.length)return source;
  const firstIndex=source.indexOf(items[0]!.full);
  const last=items[items.length-1]!;
  const lastIndex=source.lastIndexOf(last.full)+last.full.length;
  const prefix=source.slice(0,firstIndex);
  const suffix=source.slice(lastIndex);
  const replacement=transform(items).map(item=>item.full).join('\n');
  return prefix+replacement+suffix;
}

export function deleteWebsiteBlock(html:string,instanceId:string):string{
  const id=safeInstanceId(instanceId);
  return replaceMarkedBlocks(html,items=>items.filter(item=>item.instanceId!==id));
}

export function moveWebsiteBlock(html:string,instanceId:string,direction:-1|1):string{
  const id=safeInstanceId(instanceId);
  return replaceMarkedBlocks(html,items=>{
    const index=items.findIndex(item=>item.instanceId===id);
    const target=index+direction;
    if(index<0||target<0||target>=items.length)return items;
    const next=[...items];
    const current=next[index]!;
    next[index]=next[target]!;
    next[target]=current;
    return next;
  });
}

export function duplicateWebsiteBlock(html:string,instanceId:string):string{
  const id=safeInstanceId(instanceId);
  return replaceMarkedBlocks(html,items=>{
    const index=items.findIndex(item=>item.instanceId===id);
    if(index<0)return items;
    const source=items[index]!;
    const duplicateMarkup=createWebsiteBlockMarkup(source.blockId);
    const match=BLOCK_PATTERN.exec(duplicateMarkup);
    BLOCK_PATTERN.lastIndex=0;
    if(!match)return items;
    const duplicate={full:duplicateMarkup,instanceId:match[1]!,blockId:match[2]!,body:match[3]||''};
    const next=[...items];
    next.splice(index+1,0,duplicate);
    return next;
  });
}
