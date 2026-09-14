export type WebsiteSection={id:string;type:string;label:string};
export function normalizeSections(input:unknown[]):WebsiteSection[]{
  return (input||[]).map((item,index)=>{
    if(typeof item==='string')return {id:`section-${index}-${item.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,type:item.toLowerCase().replace(/[^a-z0-9]+/g,'-'),label:item};
    const value=(item&&typeof item==='object'?item:{}) as Record<string,unknown>;
    const label=String(value.label||value.type||`Section ${index+1}`);
    return {id:String(value.id||`section-${index}`),type:String(value.type||'section'),label};
  });
}
export function moveWebsiteSection(sections:WebsiteSection[],index:number,direction:-1|1):WebsiteSection[]{
  const target=index+direction;
  if(index<0||index>=sections.length||target<0||target>=sections.length)return sections;
  const next=[...sections];
  [next[index],next[target]]=[next[target],next[index]];
  return next;
}
export function addWebsiteSection(sections:WebsiteSection[],type:string,label?:string):WebsiteSection[]{
  const safeType=type.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')||'section';
  return [...sections,{id:crypto.randomUUID(),type:safeType,label:label?.trim()||type.trim()||'Section'}];
}
