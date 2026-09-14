import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server';
import { runChat, type ChatMessage } from '@/lib/runtime/model-gateway.server';
import { writeAudit } from '@/lib/platform/audit.server';
import { recordUsage } from '@/lib/platform/entitlements.server';

type Sb={from:(t:string)=>any};
type JsonPrimitive=string|number|boolean|null;
type JsonValue=JsonPrimitive|JsonValue[]|{[key:string]:JsonValue};
type WebsiteIterationResult={summary:string;html:string;css:string;javascript:string;pages:Array<{[key:string]:JsonValue}>;designTokens:{[key:string]:JsonValue};provider:string;model:string};

const inputSchema=z.object({
  projectId:z.string().uuid().optional(),
  instruction:z.string().trim().min(5).max(8000),
  name:z.string().trim().min(1).max(160),
  brief:z.record(z.string(),z.unknown()).default({}),
  pages:z.array(z.record(z.string(),z.unknown())).max(100).default([]),
  designTokens:z.record(z.string(),z.unknown()).default({}),
  html:z.string().max(180000).default(''),
  css:z.string().max(180000).default(''),
  javascript:z.string().max(180000).default(''),
});

const outputSchema=z.object({
  summary:z.string().max(2000),
  html:z.string().max(250000),
  css:z.string().max(250000),
  javascript:z.string().max(250000),
  pages:z.array(z.record(z.string(),z.json())).max(100),
  designTokens:z.record(z.string(),z.json()),
});

function parseJsonPayload(text:string):Omit<WebsiteIterationResult,'provider'|'model'>{
  const cleaned=text.trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  const start=cleaned.indexOf('{');
  const end=cleaned.lastIndexOf('}');
  if(start<0||end<=start) throw new Error('Website generator did not return structured code.');
  return outputSchema.parse(JSON.parse(cleaned.slice(start,end+1)));
}

export const generateWebsiteIteration=createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((v:unknown)=>inputSchema.parse(v))
  .handler(async({data,context}):Promise<WebsiteIterationResult>=>{
    const sb=context.supabase as unknown as Sb;
    const pref=await sb.from('user_ai_preferences').select('default_provider,default_model').eq('user_id',context.userId).maybeSingle();
    const {provider,model,source}=resolveAssistantModelPreference(pref.error?null:pref.data);

    const system=[
      'You are Blackstar Website Studio, a governed website code generator.',
      'Return ONLY one JSON object with keys summary, html, css, javascript, pages, designTokens.',
      'The top-level html is the Home (/) document. For every non-home route in pages, include a page.html string containing a complete accessible HTML document when that page needs distinct content. Page documents share the top-level CSS and JavaScript by default.',
      'Generate original website code from the user brief and existing project. Do not copy a named website or proprietary product verbatim.',
      'Preserve useful existing work unless the instruction asks to replace it.',
      'Use semantic accessible HTML, responsive CSS, keyboard-friendly interactions and progressive enhancement.',
      'Do not include remote scripts, trackers, credential collection, hidden redirects, cryptocurrency miners, browser exploits or code that exfiltrates data.',
      'Do not invent business claims, testimonials, certifications, prices or customer logos as factual. Mark placeholders clearly.',
      'JavaScript must be browser-only and self-contained. No eval, Function constructor, document.write, localStorage secrets or network requests unless the user explicitly asks for a benign public integration.',
      'Keep the output practical enough to render in a sandboxed preview.',
    ].join(' ');

    const user=[
      `Project: ${data.name}`,
      `Requested change: ${data.instruction}`,
      `Brief JSON: ${JSON.stringify(data.brief)}`,
      `Pages JSON (page objects may include their own html documents): ${JSON.stringify(data.pages)}`,
      `Design tokens JSON: ${JSON.stringify(data.designTokens)}`,
      'CURRENT HTML:',
      data.html.slice(0,180000),
      'CURRENT CSS:',
      data.css.slice(0,180000),
      'CURRENT JAVASCRIPT:',
      data.javascript.slice(0,180000),
    ].join('\n\n');

    const messages:ChatMessage[]=[{role:'system',content:system},{role:'user',content:user}];
    try{
      const result=await runChat({provider,model,messages,maxTokens:9000});
      if(!result.text.trim()) throw new Error('Website generator returned an empty response.');
      const generated=parseJsonPayload(result.text);
      await recordUsage({userId:context.userId,metric:'assistant_message',quantity:1,metadata:{surface:'website_studio',provider:result.provider,model:result.model,preference_source:source}});
      await writeAudit({userId:context.userId,action:'website_studio.ai_iteration.generate',targetType:'website_studio_project',...(data.projectId?{targetId:data.projectId}:{}),status:'success',metadata:{provider:result.provider,model:result.model}});
      return {...generated,provider:result.provider,model:result.model};
    }catch(error){
      await writeAudit({userId:context.userId,action:'website_studio.ai_iteration.generate',targetType:'website_studio_project',...(data.projectId?{targetId:data.projectId}:{}),status:'failed',metadata:{provider,model,error:error instanceof Error?error.message.slice(0,300):'unknown'}});
      throw new Error(error instanceof Error?error.message:'Website generation failed.');
    }
  });
