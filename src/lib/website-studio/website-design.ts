export type WebsiteDesignTokens={theme?:string;radius?:string;spacing?:string;typography?:string;accent?:string;background?:string;foreground?:string};
export function designTokensToCss(tokens:WebsiteDesignTokens):string{
  const radius=tokens.radius||'18px';
  const accent=tokens.accent||'#8b5cf6';
  const background=tokens.background||'#07080d';
  const foreground=tokens.foreground||'#f7f7fb';
  return `:root{--ws-radius:${radius};--ws-accent:${accent};--ws-background:${background};--ws-foreground:${foreground};}`;
}
export function upsertDesignTokenCss(css:string,tokens:WebsiteDesignTokens):string{
  const marker='/* BLACKSTAR_DESIGN_TOKENS */';
  const block=`${marker}\n${designTokensToCss(tokens)}\n`;
  const source=String(css||'');
  const pattern=/\/\* BLACKSTAR_DESIGN_TOKENS \*\/[\s\S]*?(?=\/\* BLACKSTAR_DESIGN_TOKENS_END \*\/)/;
  const wrapped=`${block}/* BLACKSTAR_DESIGN_TOKENS_END */`;
  if(pattern.test(source)) return source.replace(pattern,block);
  return wrapped+'\n'+source;
}
