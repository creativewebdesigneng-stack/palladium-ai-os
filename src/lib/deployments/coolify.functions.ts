import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit,writeAuditRequired } from '@/lib/platform/audit.server';
import {isPlatformAdmin} from '@/lib/marketplace/marketplace.server';
import {providerEndpoint,requestProviderJson} from '@/lib/security/provider-http.server';

type Sb = { from: (table: string) => any;rpc:(name:string,args?:Record<string,unknown>)=>any };
const kindSchema = z.enum(['application','service','database']);
function baseUrl() { return process.env['COOLIFY_API_URL']?.trim().replace(/\/+$/, '') || null; }
function token() { return process.env['COOLIFY_API_TOKEN']?.trim() || null; }

async function coolify(path: string, init?: RequestInit) {
  const base = providerEndpoint(baseUrl()??undefined); const key = token();
  if (!base || !key) throw new Error('Coolify is not configured. Set COOLIFY_API_URL and COOLIFY_API_TOKEN.');
  return requestProviderJson(new URL(base.toString().replace(/\/+$/,'')+path),key,init);
}

async function requireDeploymentAdmin(sb:Sb,userId:string){
  if(!await isPlatformAdmin(sb,userId))throw new Error('Platform administrator access is required to manage this shared deployment connection.');
}

export const getDeploymentOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('deployment_targets').select('*').eq('user_id', context.userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { configured: Boolean(providerEndpoint(baseUrl()??undefined) && token()), canManage:await isPlatformAdmin(sb,context.userId),targets: data ?? [] };
  });

export const saveDeploymentTarget = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(100), resourceKind: kindSchema, resourceUuid: z.string().trim().min(3).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireDeploymentAdmin(sb,context.userId);
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const { data: row, error } = await (supabaseAdmin as any).from('deployment_targets').upsert({ user_id: context.userId, provider: 'coolify', name: data.name, resource_kind: data.resourceKind, resource_uuid: data.resourceUuid, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider,resource_uuid' }).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error('Deployment target could not be saved.');
    await writeAudit({ userId: context.userId, action: 'deployments.target_saved', targetType: 'deployment_target', targetId: row.id, metadata: { provider: 'coolify', kind: data.resourceKind } });
    return row;
  });

export const triggerCoolifyDeployment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), action: z.enum(['deploy','restart','stop']) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireDeploymentAdmin(sb,context.userId);
    const found = await sb.from('deployment_targets').select('*').eq('id', data.id).eq('user_id', context.userId).maybeSingle();
    if (found.error) throw new Error(found.error.message);
    const target = found.data;
    if (!target) throw new Error('Deployment target not found.');
    if(target.provider!=='coolify'||!['application','service','database'].includes(target.resource_kind))throw new Error('Invalid deployment target.');
    let path: string;
    if (data.action === 'deploy' && target.resource_kind === 'application') path = `/api/v1/deploy?uuid=${encodeURIComponent(target.resource_uuid)}&force=false`;
    else path = `/api/v1/${target.resource_kind}s/${encodeURIComponent(target.resource_uuid)}/${data.action === 'deploy' ? 'start' : data.action}`;
    await writeAuditRequired({userId:context.userId,action:`deployments.coolify_${data.action}_requested`,targetType:'deployment_target',targetId:target.id,metadata:{resourceUuid:target.resource_uuid}});
    const result = await coolify(path, { method: 'POST' });
    await writeAudit({ userId: context.userId, action: `deployments.coolify_${data.action}`, targetType: 'deployment_target', targetId: target.id, metadata: { resourceUuid: target.resource_uuid } });
    return { ok: true, result };
  });
