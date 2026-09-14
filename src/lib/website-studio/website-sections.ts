export type WebsiteSectionTheme='inherit'|'light'|'dark'|'accent';
export type WebsiteSectionWidth='contained'|'wide'|'full';
export type WebsiteSectionPadding='compact'|'normal'|'spacious';
export type WebsiteSection={id:string;type:string;label:string;variant?:string;theme?:WebsiteSectionTheme;width?:WebsiteSectionWidth;padding?:WebsiteSectionPadding;hidden?:boolean};
export function normalizeSections(input:unknown[]):WebsiteSection[]{
  return (input||[]).map((item,index)=>{
    if(typeof item==='string')return {id:`section-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,type:item.toLowerCase().replace(/[^a-z0-9]+/g,'-'),label:item,variant:'default',theme:'inherit' as const,width:'contained' as const,padding:'normal' as const,hidden:false};
    const value=(item&&typeof item==='object'?item:{}) as Record<string,unknown>;
    const label=String(value['label']||value['type']||`Section ${index+1}`);
    const theme=['inherit','light','dark','accent'].includes(String(value['theme']))?String(value['theme']) as WebsiteSectionTheme:'inherit';
    const width=['contained','wide','full'].includes(String(value['width']))?String(value['width']) as WebsiteSectionWidth:'contained';
    const padding=['compact','normal','spacious'].includes(String(value['padding']))?String(value['padding']) as WebsiteSectionPadding:'normal';
    return {id:String(value['id']||`section-${index}`),type:String(value['type']||'section'),label,variant:String(value['variant']||'default'),theme,width,padding,hidden:Boolean(value['hidden'])};
  });
}
export function moveWebsiteSection(sections:WebsiteSection[],index:number,direction:-1|1):WebsiteSection[]{
  const target=index+direction;
  if(index<0||index>=sections.length||target<0||target>=sections.length)return sections;
  const next=[...sections];
  const current=next[index]!;
  const destination=next[target]!;
  next[index]=destination;
  next[target]=current;
  return next;
}
export function addWebsiteSection(sections:WebsiteSection[],type:string,label?:string):WebsiteSection[]{
  const safeType=type.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')||'section';
  return [...sections,{id:crypto.randomUUID(),type:safeType,label:label?.trim()||type.trim()||'Section',variant:'default',theme:'inherit',width:'contained',padding:'normal',hidden:false}];
}


export function reorderWebsiteSections(sections:WebsiteSection[],sourceIndex:number,destinationIndex:number):WebsiteSection[]{
  if(sourceIndex===destinationIndex||sourceIndex<0||destinationIndex<0||sourceIndex>=sections.length||destinationIndex>=sections.length)return sections;
  const next=[...sections];
  const [moved]=next.splice(sourceIndex,1);
  if(!moved)return sections;
  next.splice(destinationIndex,0,moved);
  return next;
}


export function updateWebsiteSection(sections:WebsiteSection[],id:string,patch:Partial<WebsiteSection>):WebsiteSection[]{
  return sections.map(section=>section.id===id?{...section,...patch,id:section.id}:section);
}

function escapeSectionAttribute(value:string):string{
  return value.replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;');
}

export function applyWebsiteSectionContract(html:string,sections:WebsiteSection[]):string{
  let index=0;
  return String(html||'').replace(/<section\b[^>]*>/gi,(tag)=>{
    const section=sections[index++];
    if(!section)return tag;
    let next=tag.replace(/\sdata-ws-(?:section|variant|theme|width|padding|hidden)=\"[^\"]*\"/gi,'');
    const attrs=[
      `data-ws-section=\"${escapeSectionAttribute(section.id)}\"`,
      `data-ws-variant=\"${escapeSectionAttribute(section.variant||'default')}\"`,
      `data-ws-theme=\"${section.theme||'inherit'}\"`,
      `data-ws-width=\"${section.width||'contained'}\"`,
      `data-ws-padding=\"${section.padding||'normal'}\"`,
      `data-ws-hidden=\"${section.hidden?'true':'false'}\"`,
    ].join(' ');
    return next.replace(/>$/,` ${attrs}>`);
  });
}

export function websiteSectionContractCss():string{
  return '[data-ws-hidden="true"]{display:none!important}\n[data-ws-width="contained"]{width:min(1120px,calc(100% - 32px));margin-inline:auto}\n[data-ws-width="wide"]{width:min(1440px,calc(100% - 24px));margin-inline:auto}\n[data-ws-width="full"]{width:100%}\n[data-ws-padding="compact"]{padding-block:clamp(24px,4vw,48px)}\n[data-ws-padding="normal"]{padding-block:clamp(48px,7vw,96px)}\n[data-ws-padding="spacious"]{padding-block:clamp(72px,10vw,144px)}\n[data-ws-theme="light"]{color:#111;background:#fff}\n[data-ws-theme="dark"]{color:#f7f7fb;background:#08090d}\n[data-ws-theme="accent"]{color:var(--ws-foreground,#fff);background:var(--ws-accent,#8b5cf6)}';
}
