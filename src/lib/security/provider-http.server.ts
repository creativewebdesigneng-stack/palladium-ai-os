import {assertPublicNetworkEndpoint} from './public-network.server';
type JsonValue=string|number|boolean|null|JsonValue[]|{[key:string]:JsonValue};

/** Shared credentialed provider boundary: HTTPS, public DNS, no redirects, bounded response. */
export function providerEndpoint(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  try {
    const url=new URL(value.trim());
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash) return null;
    return url;
  } catch {return null;}
}

export async function requestProviderJson(endpoint: URL, token: string, init: RequestInit={}) {
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.hash)throw new Error('Provider requests require HTTPS without embedded credentials or fragments.');
  if(!token.trim()) throw new Error('The provider requires an authenticated server connection.');
  await assertPublicNetworkEndpoint(endpoint);
  const response=await fetch(endpoint,{...init,redirect:'error',signal:AbortSignal.timeout(20_000),headers:{...init.headers,Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`}});
  if(!response.ok) {await response.body?.cancel();throw new Error(`Provider request failed (${response.status}).`);}
  const reader=response.body?.getReader();if(!reader)throw new Error('Provider response was empty.');
  let size=0;const chunks:Uint8Array[]=[];
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144)throw new Error('Provider response exceeded the size limit.');chunks.push(value);}
  }finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let parsed:unknown;try {parsed=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error('Provider returned invalid JSON.');}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Provider returned an invalid object.');
  return parsed as Record<string,JsonValue>;
}
