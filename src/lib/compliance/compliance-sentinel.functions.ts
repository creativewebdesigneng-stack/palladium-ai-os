import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any };

const idSchema = z.object({ id: z.string().uuid() });
const profileSchema = z.object({
  name: z.string().trim().min(1).max(180),
  organisation_context: z.string().trim().max(4000).optional().default(''),
  jurisdictions: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  sectors: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  products_services: z.array(z.string().trim().min(1).max(180)).max(100).default([]),
  risk_appetite: z.enum(['conservative', 'standard', 'elevated']).default('standard'),
  framework_preferences: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
});
const obligationSchema = z.object({
  profile_id: z.string().uuid().optional().nullable(),
  regulation_id: z.string().uuid().optional().nullable(),
  regulation_version_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(240),
  requirement: z.string().trim().min(1).max(12000),
  jurisdiction: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(120).default('general'),
  owner_name: z.string().trim().max(180).optional().default(''),
  status: z.enum(['review', 'planned', 'implemented', 'monitoring', 'exception', 'not_applicable']).default('review'),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  effective_on: z.string().optional().default(''),
  due_on: z.string().optional().default(''),
  next_review_on: z.string().optional().default(''),
  source_url: z.string().url().optional().or(z.literal('')).default(''),
  notes: z.string().trim().max(8000).optional().default(''),
});
const controlSchema = z.object({
  profile_id: z.string().uuid().optional().nullable(),
  control_code: z.string().trim().max(80).optional().default(''),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(8000).optional().default(''),
  framework: z.string().trim().max(180).optional().default(''),
  control_type: z.enum(['preventive', 'detective', 'corrective', 'directive', 'compensating']).default('preventive'),
  frequency: z.string().trim().max(120).optional().default(''),
  owner_name: z.string().trim().max(180).optional().default(''),
  implementation_status: z.enum(['planned', 'designed', 'implemented', 'operating', 'deficient', 'retired']).default('designed'),
  testing_status: z.enum(['untested', 'scheduled', 'effective', 'partially_effective', 'ineffective']).default('untested'),
  next_test_on: z.string().optional().default(''),
});
const findingSchema = z.object({
  profile_id: z.string().uuid().optional().nullable(),
  assessment_id: z.string().uuid().optional().nullable(),
  obligation_id: z.string().uuid().optional().nullable(),
  control_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(8000).optional().default(''),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['open', 'accepted', 'remediating', 'resolved', 'closed']).default('open'),
  owner_name: z.string().trim().max(180).optional().default(''),
  remediation_plan: z.string().trim().max(8000).optional().default(''),
  due_on: z.string().optional().default(''),
});
const alertSchema = z.object({
  profile_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(180),
  jurisdictions: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  regulators: z.array(z.string().trim().min(1).max(180)).max(50).default([]),
  domains: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  minimum_severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).default('medium'),
  channels: z.array(z.enum(['in_app', 'email', 'webhook'])).min(1).max(3).default(['in_app']),
});

function nullable(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

async function assertOwnedProfile(sb: Sb, userId: string, profileId?: string | null) {
  if (!profileId) return;
  const { data, error } = await sb.from('compliance_profiles').select('id').eq('id', profileId).eq('user_id', userId).maybeSingle();
  if (error || !data) throw new Error('Compliance profile not found.');
}

export const getComplianceSentinelDashboard = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const [sources, changes, obligations, controls, findings, profiles] = await Promise.all([
      sb.from('compliance_regulatory_sources').select('id,jurisdiction,automation_ready,last_success_at,last_error,active').eq('active', true),
      sb.from('compliance_regulatory_changes').select('id,severity,detected_at,review_required').order('detected_at', { ascending: false }).limit(100),
      sb.from('compliance_obligations').select('id,status,risk_level,due_on').eq('user_id', userId),
      sb.from('compliance_controls').select('id,implementation_status,testing_status').eq('user_id', userId),
      sb.from('compliance_findings').select('id,status,severity,due_on').eq('user_id', userId),
      sb.from('compliance_profiles').select('id,active').eq('user_id', userId),
    ]);
    for (const result of [sources, changes, obligations, controls, findings, profiles]) if (result.error) throw new Error(result.error.message);
    const sourceRows = sources.data ?? [];
    const obligationRows = obligations.data ?? [];
    const controlRows = controls.data ?? [];
    const findingRows = findings.data ?? [];
    const changeRows = changes.data ?? [];
    const implemented = controlRows.filter((x: any) => ['implemented', 'operating'].includes(x.implementation_status)).length;
    return {
      jurisdictions: new Set(sourceRows.map((x: any) => x.jurisdiction)).size,
      sources: sourceRows.length,
      automatedSources: sourceRows.filter((x: any) => x.automation_ready).length,
      sourceErrors: sourceRows.filter((x: any) => x.last_error).length,
      profiles: (profiles.data ?? []).filter((x: any) => x.active).length,
      activeObligations: obligationRows.filter((x: any) => x.status !== 'not_applicable').length,
      criticalObligations: obligationRows.filter((x: any) => x.risk_level === 'critical' && x.status !== 'implemented').length,
      highImpactChanges: changeRows.filter((x: any) => ['high', 'critical'].includes(x.severity)).length,
      openFindings: findingRows.filter((x: any) => !['resolved', 'closed'].includes(x.status)).length,
      criticalFindings: findingRows.filter((x: any) => x.severity === 'critical' && !['resolved', 'closed'].includes(x.status)).length,
      controlCoverage: controlRows.length ? Math.round((implemented / controlRows.length) * 100) : 0,
      latestChangeAt: changeRows[0]?.detected_at ?? null,
    };
  });

export const listComplianceSources = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('compliance_regulatory_sources').select('*').order('jurisdiction').order('regulator');
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listComplianceRegulatoryChanges = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ limit: z.coerce.number().int().min(1).max(250).default(100) }).parse(value ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb.from('compliance_regulatory_changes').select('*, regulation:compliance_regulations(id,title,jurisdiction,status,canonical_url,regulator_reference,source_id)').order('detected_at', { ascending: false }).limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listComplianceRegulations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ jurisdiction: z.string().trim().max(120).optional(), status: z.string().trim().max(40).optional(), limit: z.coerce.number().int().min(1).max(500).default(200) }).parse(value ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb.from('compliance_regulations').select('*, source:compliance_regulatory_sources(id,regulator,title,canonical_url,last_success_at,automation_ready)').order('updated_at', { ascending: false }).limit(data.limit);
    if (data.jurisdiction) query = query.eq('jurisdiction', data.jurisdiction);
    if (data.status) query = query.eq('status', data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getComplianceRegulationTimeline = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ regulation_id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [regulation, versions, changes] = await Promise.all([
      sb.from('compliance_regulations').select('*, source:compliance_regulatory_sources(*)').eq('id', data.regulation_id).maybeSingle(),
      sb.from('compliance_regulation_versions').select('*').eq('regulation_id', data.regulation_id).order('captured_at', { ascending: false }),
      sb.from('compliance_regulatory_changes').select('*').eq('regulation_id', data.regulation_id).order('detected_at', { ascending: false }),
    ]);
    if (regulation.error || !regulation.data) throw new Error(regulation.error?.message ?? 'Regulation not found.');
    if (versions.error) throw new Error(versions.error.message);
    if (changes.error) throw new Error(changes.error.message);
    return { regulation: regulation.data, versions: versions.data ?? [], changes: changes.data ?? [] };
  });

export const listComplianceProfiles = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('compliance_profiles').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => profileSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('compliance_profiles').insert({ ...data, organisation_context: nullable(data.organisation_context), user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listComplianceObligations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('compliance_obligations').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceObligation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => obligationSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedProfile(sb, context.userId, data.profile_id);
    const { data: row, error } = await sb.from('compliance_obligations').insert({ ...data, profile_id: data.profile_id ?? null, regulation_id: data.regulation_id ?? null, regulation_version_id: data.regulation_version_id ?? null, jurisdiction: nullable(data.jurisdiction), owner_name: nullable(data.owner_name), effective_on: nullable(data.effective_on), due_on: nullable(data.due_on), next_review_on: nullable(data.next_review_on), source_url: nullable(data.source_url), notes: nullable(data.notes), user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listComplianceControls = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('compliance_controls').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceControl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => controlSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedProfile(sb, context.userId, data.profile_id);
    const { data: row, error } = await sb.from('compliance_controls').insert({ ...data, profile_id: data.profile_id ?? null, control_code: nullable(data.control_code), description: nullable(data.description), framework: nullable(data.framework), frequency: nullable(data.frequency), owner_name: nullable(data.owner_name), next_test_on: nullable(data.next_test_on), user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listComplianceFindings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('compliance_findings').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceFinding = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => findingSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedProfile(sb, context.userId, data.profile_id);
    const { data: row, error } = await sb.from('compliance_findings').insert({ ...data, profile_id: data.profile_id ?? null, assessment_id: data.assessment_id ?? null, obligation_id: data.obligation_id ?? null, control_id: data.control_id ?? null, description: nullable(data.description), owner_name: nullable(data.owner_name), remediation_plan: nullable(data.remediation_plan), due_on: nullable(data.due_on), user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listComplianceAlerts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from('compliance_alerts').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceAlert = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => alertSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedProfile(sb, context.userId, data.profile_id);
    const { data: row, error } = await sb.from('compliance_alerts').insert({ ...data, profile_id: data.profile_id ?? null, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteComplianceOwnedRecord = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ table: z.enum(['compliance_profiles','compliance_obligations','compliance_controls','compliance_findings','compliance_alerts']), id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from(data.table).delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getComplianceOwnedRecord = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => idSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('compliance_obligations').select('*').eq('id', data.id).eq('user_id', context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });
