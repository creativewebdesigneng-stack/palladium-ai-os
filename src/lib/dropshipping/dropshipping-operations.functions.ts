import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };
const uuid = z.string().uuid();
const status = z.enum(['watching','validating','test','shortlisted','approved','rejected','launched','archived']);
const evidenceStatus = z.enum(['none','partial','ready']);
const complianceStatus = z.enum(['unknown','eligible','review','blocked']);
const safeRef = z.string().trim().max(4000).optional().nullable().refine((value) => !value || !/(?:api[_-]?key|secret|token|password)\s*[:=]/i.test(value), 'Store credentials in Blackstar Integrations, not dropshipping evidence.');
const jsonRecord = z.record(z.string(), z.unknown());

async function requireOpportunity(sb: Sb, userId: string, opportunityId: string) {
  const { data, error } = await sb.from('dropshipping_opportunities').select('id,name,status').eq('id', opportunityId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Dropshipping opportunity not found.');
  return data;
}

export const listDropshippingOperations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const opportunitiesResult = await sb.from('dropshipping_opportunities').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false }).limit(200);
    if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);
    const opportunities = opportunitiesResult.data ?? [];
    const ids = opportunities.map((row: any) => row.id);
    if (!ids.length) return { opportunities: [], signals: [], suppliers: [], snapshots: [] };
    const [signalsResult, suppliersResult, snapshotsResult] = await Promise.all([
      sb.from('dropshipping_opportunity_signals').select('*').eq('user_id', context.userId).in('opportunity_id', ids).order('observed_at', { ascending: false }).limit(1000),
      sb.from('dropshipping_opportunity_suppliers').select('*').eq('user_id', context.userId).in('opportunity_id', ids).order('updated_at', { ascending: false }).limit(500),
      sb.from('dropshipping_opportunity_snapshots').select('*').eq('user_id', context.userId).in('opportunity_id', ids).order('captured_at', { ascending: false }).limit(1000),
    ]);
    for (const result of [signalsResult, suppliersResult, snapshotsResult]) if (result.error) throw new Error(result.error.message);
    return { opportunities, signals: signalsResult.data ?? [], suppliers: suppliersResult.data ?? [], snapshots: snapshotsResult.data ?? [] };
  });

const opportunityInput = z.object({
  id: uuid.optional(),
  commerceWorkspaceId: uuid.nullish(),
  retailWorkspaceId: uuid.nullish(),
  websiteProjectId: uuid.nullish(),
  name: z.string().trim().min(1).max(180),
  niche: z.string().trim().max(240).optional().nullable(),
  targetMarket: z.string().trim().max(160).optional().nullable(),
  status: status.default('watching'),
  channels: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  opportunityScore: z.number().int().min(0).max(100).optional().nullable(),
  scoreBand: z.string().trim().max(80).optional().nullable(),
  scoreInputs: jsonRecord.default({}),
  economics: jsonRecord.default({}),
  complianceStatus: complianceStatus.default('unknown'),
  evidenceStatus: evidenceStatus.default('none'),
  researchSummary: z.string().max(50000).optional().nullable(),
  notes: z.string().max(12000).optional().nullable(),
});

export const saveDropshippingOpportunity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => opportunityInput.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      commerce_workspace_id: data.commerceWorkspaceId ?? null,
      retail_workspace_id: data.retailWorkspaceId ?? null,
      website_project_id: data.websiteProjectId ?? null,
      name: data.name,
      niche: data.niche || null,
      target_market: data.targetMarket || null,
      status: data.status,
      channels: data.channels,
      opportunity_score: data.opportunityScore ?? null,
      score_band: data.scoreBand || null,
      score_inputs: data.scoreInputs,
      economics: data.economics,
      compliance_status: data.complianceStatus,
      evidence_status: data.evidenceStatus,
      research_summary: data.researchSummary || null,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await sb.from('dropshipping_opportunities').update(row).eq('id', data.id).eq('user_id', context.userId).select('*').single()
      : await sb.from('dropshipping_opportunities').insert({ ...row, user_id: context.userId }).select('*').single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'Opportunity could not be saved.');
    await writeAudit({ userId: context.userId, action: data.id ? 'dropshipping.opportunity_updated' : 'dropshipping.opportunity_created', targetType: 'dropshipping_opportunity', targetId: result.data.id, metadata: { status: data.status, evidenceStatus: data.evidenceStatus } });
    return result.data;
  });

const researchSource = z.object({ url: z.string().url().max(4000), title: z.string().max(500).optional().nullable(), snippet: z.string().max(4000).optional().nullable() });
export const saveDropshippingResearchOpportunity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    name: z.string().trim().min(1).max(180),
    niche: z.string().trim().min(1).max(240),
    targetMarket: z.string().trim().max(160).optional().nullable(),
    mode: z.enum(['products','seo']),
    provider: z.string().trim().max(120).optional().nullable(),
    model: z.string().trim().max(160).optional().nullable(),
    report: z.string().max(50000),
    sources: z.array(researchSource).max(25).default([]),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: opportunity, error } = await sb.from('dropshipping_opportunities').insert({
      user_id: context.userId,
      name: data.name,
      niche: data.niche,
      target_market: data.targetMarket || null,
      status: 'watching',
      evidence_status: data.sources.length ? 'partial' : 'none',
      research_summary: data.report,
      score_inputs: { researchMode: data.mode, provider: data.provider ?? null, model: data.model ?? null },
    }).select('*').single();
    if (error || !opportunity) throw new Error(error?.message ?? 'Research opportunity could not be saved.');
    if (data.sources.length) {
      const rows = data.sources.map((source) => ({
        user_id: context.userId,
        opportunity_id: opportunity.id,
        signal_type: data.mode === 'seo' ? 'search' : 'research',
        source_provider: data.provider || 'blackstar-research',
        source_ref: source.url,
        metric_name: 'source_evidence',
        confidence: 'observed',
        payload: { title: source.title ?? null, snippet: source.snippet ?? null, market: data.targetMarket ?? null, researchMode: data.mode },
      }));
      const signalResult = await sb.from('dropshipping_opportunity_signals').insert(rows);
      if (signalResult.error) {
        await sb.from('dropshipping_opportunities').delete().eq('id', opportunity.id).eq('user_id', context.userId);
        throw new Error(signalResult.error.message);
      }
    }
    await writeAudit({ userId: context.userId, action: 'dropshipping.research_saved', targetType: 'dropshipping_opportunity', targetId: opportunity.id, metadata: { mode: data.mode, sources: data.sources.length } });
    return opportunity;
  });

export const addDropshippingSignal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    opportunityId: uuid,
    signalType: z.enum(['research','search','marketplace','supplier','social','competitor','price','fulfilment']),
    sourceProvider: z.string().trim().max(120).optional().nullable(),
    sourceRef: safeRef,
    metricName: z.string().trim().max(160).optional().nullable(),
    metricValue: z.number().finite().optional().nullable(),
    confidence: z.enum(['observed','high','medium','low','inferred']).default('observed'),
    payload: jsonRecord.default({}),
    observedAt: z.string().datetime({ offset: true }).optional(),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOpportunity(sb, context.userId, data.opportunityId);
    const { data: out, error } = await sb.from('dropshipping_opportunity_signals').insert({
      user_id: context.userId,
      opportunity_id: data.opportunityId,
      signal_type: data.signalType,
      source_provider: data.sourceProvider || null,
      source_ref: data.sourceRef || null,
      metric_name: data.metricName || null,
      metric_value: data.metricValue ?? null,
      confidence: data.confidence,
      payload: data.payload,
      observed_at: data.observedAt ?? new Date().toISOString(),
    }).select('*').single();
    if (error || !out) throw new Error(error?.message ?? 'Evidence signal could not be saved.');
    await writeAudit({ userId: context.userId, action: 'dropshipping.signal_added', targetType: 'dropshipping_opportunity', targetId: data.opportunityId, metadata: { signalType: data.signalType, confidence: data.confidence } });
    return out;
  });

export const saveDropshippingSupplierOffer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    id: uuid.optional(), opportunityId: uuid, retailSupplierId: uuid.nullish(),
    provider: z.string().trim().max(120).optional().nullable(), supplierLabel: z.string().trim().min(1).max(180), supplierSku: z.string().trim().max(240).optional().nullable(), sourceRef: safeRef,
    role: z.enum(['candidate','primary','backup','rejected']).default('candidate'), currency: z.string().trim().min(3).max(8).default('GBP'),
    unitCost: z.number().min(0).optional().nullable(), shippingCost: z.number().min(0).optional().nullable(), estimatedDeliveryDays: z.number().int().min(0).max(3650).optional().nullable(),
    supplierScore: z.number().int().min(0).max(100).optional().nullable(), scoreInputs: jsonRecord.default({}), evidence: jsonRecord.default({}),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOpportunity(sb, context.userId, data.opportunityId);
    const row = {
      opportunity_id: data.opportunityId, retail_supplier_id: data.retailSupplierId ?? null, provider: data.provider || null, supplier_label: data.supplierLabel,
      supplier_sku: data.supplierSku || null, source_ref: data.sourceRef || null, role: data.role, currency: data.currency.toUpperCase(), unit_cost: data.unitCost ?? null,
      shipping_cost: data.shippingCost ?? null, estimated_delivery_days: data.estimatedDeliveryDays ?? null, supplier_score: data.supplierScore ?? null,
      score_inputs: data.scoreInputs, evidence: data.evidence, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await sb.from('dropshipping_opportunity_suppliers').update(row).eq('id', data.id).eq('user_id', context.userId).select('*').single()
      : await sb.from('dropshipping_opportunity_suppliers').insert({ ...row, user_id: context.userId }).select('*').single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? 'Supplier offer could not be saved.');
    return result.data;
  });

export const captureDropshippingSnapshot = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    opportunityId: uuid, opportunityScore: z.number().int().min(0).max(100).optional().nullable(), scoreBand: z.string().trim().max(80).optional().nullable(),
    scoreInputs: jsonRecord.default({}), economics: jsonRecord.default({}), supplierSummary: jsonRecord.default({}), evidenceStatus: evidenceStatus.default('none'),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOpportunity(sb, context.userId, data.opportunityId);
    const { data: out, error } = await sb.from('dropshipping_opportunity_snapshots').insert({
      user_id: context.userId, opportunity_id: data.opportunityId, opportunity_score: data.opportunityScore ?? null, score_band: data.scoreBand || null,
      score_inputs: data.scoreInputs, economics: data.economics, supplier_summary: data.supplierSummary, evidence_status: data.evidenceStatus,
    }).select('*').single();
    if (error || !out) throw new Error(error?.message ?? 'Opportunity snapshot could not be captured.');
    const update = await sb.from('dropshipping_opportunities').update({ opportunity_score: data.opportunityScore ?? null, score_band: data.scoreBand || null, score_inputs: data.scoreInputs, economics: data.economics, evidence_status: data.evidenceStatus, updated_at: new Date().toISOString() }).eq('id', data.opportunityId).eq('user_id', context.userId);
    if (update.error) throw new Error(update.error.message);
    return out;
  });

export const linkDropshippingPromotion = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ opportunityId: uuid, retailWorkspaceId: uuid, promotedCatalogItemId: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOpportunity(sb, context.userId, data.opportunityId);
    const [{ data: workspace, error: workspaceError }, { data: item, error: itemError }] = await Promise.all([
      sb.from('retail_workspaces').select('id').eq('id', data.retailWorkspaceId).eq('user_id', context.userId).maybeSingle(),
      sb.from('retail_catalog_items').select('id').eq('id', data.promotedCatalogItemId).eq('user_id', context.userId).maybeSingle(),
    ]);
    if (workspaceError || itemError) throw new Error(workspaceError?.message ?? itemError?.message ?? 'Retail link could not be verified.');
    if (!workspace || !item) throw new Error('Retail workspace or catalogue item not found.');
    const { data: out, error } = await sb.from('dropshipping_opportunities').update({ retail_workspace_id: data.retailWorkspaceId, promoted_catalog_item_id: data.promotedCatalogItemId, status: 'launched', updated_at: new Date().toISOString() }).eq('id', data.opportunityId).eq('user_id', context.userId).select('*').single();
    if (error || !out) throw new Error(error?.message ?? 'Opportunity promotion could not be linked.');
    await writeAudit({ userId: context.userId, action: 'dropshipping.opportunity_promoted', targetType: 'dropshipping_opportunity', targetId: data.opportunityId, metadata: { retailWorkspaceId: data.retailWorkspaceId, catalogItemId: data.promotedCatalogItemId } });
    return out;
  });

export const linkDropshippingRetailSupplier = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ offerId: uuid, retailSupplierId: uuid }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: offer, error: offerError }, { data: supplier, error: supplierError }] = await Promise.all([
      sb.from('dropshipping_opportunity_suppliers').select('id,opportunity_id').eq('id', data.offerId).eq('user_id', context.userId).maybeSingle(),
      sb.from('retail_suppliers').select('id').eq('id', data.retailSupplierId).eq('user_id', context.userId).maybeSingle(),
    ]);
    if (offerError || supplierError) throw new Error(offerError?.message ?? supplierError?.message ?? 'Supplier link could not be verified.');
    if (!offer || !supplier) throw new Error('Supplier offer or Retail supplier not found.');
    const { data: out, error } = await sb.from('dropshipping_opportunity_suppliers').update({ retail_supplier_id: data.retailSupplierId, updated_at: new Date().toISOString() }).eq('id', data.offerId).eq('user_id', context.userId).select('*').single();
    if (error || !out) throw new Error(error?.message ?? 'Retail supplier could not be linked.');
    return out;
  });
