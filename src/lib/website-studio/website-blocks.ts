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

type MarkedBlock={full:string;instanceId:string;blockId:string;body:string;index:number;end:number};

function markedBlocks(html:string):MarkedBlock[]{
  const source=String(html||'');
  return [...source.matchAll(BLOCK_PATTERN)].map(match=>({
    full:match[0],
    instanceId:match[1]!,
    blockId:match[2]!,
    body:match[3]||'',
    index:match.index!,
    end:match.index!+match[0].length,
  }));
}

export function deleteWebsiteBlock(html:string,instanceId:string):string{
  const source=String(html||'');
  const id=safeInstanceId(instanceId);
  const target=markedBlocks(source).find(item=>item.instanceId===id);
  if(!target)return source;
  return source.slice(0,target.index)+source.slice(target.end);
}

export function moveWebsiteBlock(html:string,instanceId:string,direction:-1|1):string{
  const source=String(html||'');
  const blocks=markedBlocks(source);
  const index=blocks.findIndex(item=>item.instanceId===safeInstanceId(instanceId));
  const targetIndex=index+direction;
  if(index<0||targetIndex<0||targetIndex>=blocks.length)return source;

  const current=blocks[index]!;
  const target=blocks[targetIndex]!;
  if(direction===1){
    const between=source.slice(current.end,target.index);
    return source.slice(0,current.index)+target.full+between+current.full+source.slice(target.end);
  }
  const between=source.slice(target.end,current.index);
  return source.slice(0,target.index)+current.full+between+target.full+source.slice(current.end);
}

export function duplicateWebsiteBlock(html:string,instanceId:string):string{
  const source=String(html||'');
  const target=markedBlocks(source).find(item=>item.instanceId===safeInstanceId(instanceId));
  if(!target)return source;
  const duplicate=createWebsiteBlockMarkup(target.blockId);
  if(!duplicate)return source;
  return source.slice(0,target.end)+'\n'+duplicate+source.slice(target.end);
}
