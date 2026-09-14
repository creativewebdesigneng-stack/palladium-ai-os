export const WEBSITE_AUTH_PROVIDERS=['email','magic-link','google','github'] as const;
export type WebsiteAuthProvider=(typeof WEBSITE_AUTH_PROVIDERS)[number];
export type WebsiteAuthConfig={
  enabled?:boolean;
  providers?:unknown[];
  supabaseUrl?:string;
  publishableKey?:string;
  allowSignUp?:boolean;
  redirectPath?:string;
};
export type NormalizedWebsiteAuthConfig={
  enabled:boolean;
  providers:WebsiteAuthProvider[];
  supabaseUrl:string;
  publishableKey:string;
  allowSignUp:boolean;
  redirectPath:string;
};

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

function validSupabaseUrl(value:string):boolean{
  if(!value)return false;
  try{
    const url=new URL(value);
    const local=url.hostname==='localhost'||url.hostname==='127.0.0.1';
    return (url.protocol==='https:'||local&&url.protocol==='http:')&&!url.username&&!url.password&&!url.search&&!url.hash;
  }catch{return false}
}

export function isWebsiteStudioPublicSupabaseKey(value:unknown):boolean{
  return typeof value==='string'&&value.trim().startsWith('sb_publishable_')&&value.trim().length>=24&&value.trim().length<=4096;
}

export function normalizeWebsiteAuthConfig(value:unknown):NormalizedWebsiteAuthConfig{
  const auth=asRecord(value);
  const rawProviders=Array.isArray(auth['providers'])?auth['providers']:[];
  const providers=[...new Set(rawProviders
    .map(provider=>String(provider||'').trim().toLowerCase())
    .filter((provider):provider is WebsiteAuthProvider=>(WEBSITE_AUTH_PROVIDERS as readonly string[]).includes(provider))
  )];
  const rawPath=typeof auth['redirectPath']==='string'?auth['redirectPath'].trim():'';
  const redirectPath=rawPath.startsWith('/')&&!rawPath.startsWith('//')?rawPath.slice(0,500):'/';
  const supabaseUrl=typeof auth['supabaseUrl']==='string'?auth['supabaseUrl'].trim().replace(/\/+$/,'').slice(0,500):'';
  const publishableKey=typeof auth['publishableKey']==='string'?auth['publishableKey'].trim().slice(0,4096):'';
  return {
    enabled:Boolean(auth['enabled']),
    providers,
    supabaseUrl,
    publishableKey,
    allowSignUp:auth['allowSignUp']!==false,
    redirectPath,
  };
}

export function websiteAuthConfigurationIssues(value:unknown):string[]{
  const auth=normalizeWebsiteAuthConfig(value);
  if(!auth.enabled)return [];
  const issues:string[]=[];
  if(auth.providers.length===0)issues.push('Select at least one authentication provider.');
  if(!validSupabaseUrl(auth.supabaseUrl))issues.push('Connect a valid site-scoped Supabase URL.');
  if(!isWebsiteStudioPublicSupabaseKey(auth.publishableKey))issues.push('Use a site-scoped sb_publishable_ key; secret and service-role keys are never accepted.');
  return issues;
}

export function isWebsiteAuthProvisioned(value:unknown):boolean{
  const auth=normalizeWebsiteAuthConfig(value);
  return !auth.enabled||websiteAuthConfigurationIssues(auth).length===0;
}
