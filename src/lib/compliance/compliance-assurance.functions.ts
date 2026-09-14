import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any };

const optionalId = z.string().uuid().optional().nullable();
const optionalText = z.string().trim().max(12000).optional().default('');
const optionalDate = z.string().trim().max(32).optional().default('');

const applicabilitySchema = z.object({
  id: optionalId,
  profile_id: optionalId,
  regulation_id: z.string().uuid(),
  status: z.enum(['review', 'applicable', 'partially_applicable', 'not_applicable', 'out_of_scope']).default('review'),
  rationale: optionalText,
  confidence: z.coerce.number().min(0).max(1).optional().nullable(),
  determination_source: z.enum(['human_review', 'blackstar_assist', 'imported']).default('human_review'),
  reviewed_by: z.string().trim().max(180).optional().default(''),
  next_review_on: optionalDate,
});

const assessmentSchema = z.object({
  id: optionalId,
  profile_id: optionalId,
  title: z.string().trim().min(1).max(240),
  assessment_type: z.enum(['compliance', 'control', 'readiness', 'gap', 'risk', 'vendor']).default('compliance'),
  scope: optionalText,
  status: z.enum(['draft', 'in_progress', 'review', 'complete', 'archived']).default('draft'),
  score: z.coerce.number().min(0).max(100).optional().nullable(),
  started_at: z.string().trim().max(64).optional().default(''),
  completed_at: z.string().trim().max(64).optional().default(''),
  assessor: z.string().trim().max(180).optional().default(''),
  findings_summary: optionalText,
});

const evidenceSchema = z.object({
  id: optionalId,
  obligation_id: optionalId,
  control_id: optionalId,
  assessment_id: optionalId,
  title: z.string().trim().min(1).max(240),
  evidence_type: z.string().trim().min(1).max(120).default('document'),
  external_url: z.string().url().optional().or(z.literal('')).default(''),
  description: optionalText,
  content_hash: z.string().trim().max(256).optional().default(''),
  valid_until: optionalDate,
  verification_status: z.enum(['unverified', 'verified', 'expired', 'rejected']).default('unverified'),
});

const mappingSchema = z.object({
  id: optionalId,
  obligation_id: z.string().uuid(),
  control_id: z.string().uuid(),
  coverage: z.enum(['full', 'partial', 'supporting', 'gap']).default('partial'),
  notes: z.string().trim().max(8000).optional().default(''),
});

function nullable(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

async function assertOwned(sb: Sb, table: string, userId: string, id?: string | null, label = 'Record') {
  if (!id) return;
  const { data, error } = await sb.from(table).select('id').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error || !data) throw new Error(`${label} not found.`);
}

async function assertRegulation(sb: Sb, id: string) {
  const { data, error } = await sb.from('compliance_regulations').select('id').eq('id', id).maybeSingle();
  if (error || !data) throw new Error('Regulation not found.');
}

async function insertOrUpdateOwned(sb: Sb, table: string, userId: string, id: string | null | undefined, payload: Record<string, unknown>) {
  if (id) {
    const { data, error } = await sb.from(table).update(payload).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await sb.from(table).insert({ ...payload, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export const listComplianceApplicability = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('compliance_applicability')
      .select('*, regulation:compliance_regulations(id,title,jurisdiction,status,canonical_url,regulator_reference), profile:compliance_profiles(id,name)')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceApplicability = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => applicabilitySchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwned(sb, 'compliance_profiles', context.userId, data.profile_id, 'Compliance profile');
    await assertRegulation(sb, data.regulation_id);
    return insertOrUpdateOwned(sb, 'compliance_applicability', context.userId, data.id, {
      profile_id: data.profile_id ?? null,
      regulation_id: data.regulation_id,
      status: data.status,
      rationale: nullable(data.rationale),
      confidence: data.confidence ?? null,
      determination_source: data.determination_source,
      reviewed_by: nullable(data.reviewed_by),
      reviewed_at: data.status === 'review' ? null : new Date().toISOString(),
      next_review_on: nullable(data.next_review_on),
    });
  });

export const listComplianceAssessments = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('compliance_assessments')
      .select('*, profile:compliance_profiles(id,name)')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceAssessment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => assessmentSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwned(sb, 'compliance_profiles', context.userId, data.profile_id, 'Compliance profile');
    return insertOrUpdateOwned(sb, 'compliance_assessments', context.userId, data.id, {
      profile_id: data.profile_id ?? null,
      title: data.title,
      assessment_type: data.assessment_type,
      scope: nullable(data.scope),
      status: data.status,
      score: data.score ?? null,
      started_at: nullable(data.started_at),
      completed_at: nullable(data.completed_at),
      assessor: nullable(data.assessor),
      findings_summary: nullable(data.findings_summary),
    });
  });

export const listComplianceEvidence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('compliance_evidence')
      .select('*, obligation:compliance_obligations(id,title), control:compliance_controls(id,control_code,title), assessment:compliance_assessments(id,title)')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceEvidence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => evidenceSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await Promise.all([
      assertOwned(sb, 'compliance_obligations', context.userId, data.obligation_id, 'Obligation'),
      assertOwned(sb, 'compliance_controls', context.userId, data.control_id, 'Control'),
      assertOwned(sb, 'compliance_assessments', context.userId, data.assessment_id, 'Assessment'),
    ]);
    return insertOrUpdateOwned(sb, 'compliance_evidence', context.userId, data.id, {
      obligation_id: data.obligation_id ?? null,
      control_id: data.control_id ?? null,
      assessment_id: data.assessment_id ?? null,
      title: data.title,
      evidence_type: data.evidence_type,
      external_url: nullable(data.external_url),
      description: nullable(data.description),
      content_hash: nullable(data.content_hash),
      valid_until: nullable(data.valid_until),
      verification_status: data.verification_status,
    });
  });

export const listComplianceControlMappings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('compliance_control_mappings')
      .select('*, obligation:compliance_obligations(id,title,status,risk_level), control:compliance_controls(id,control_code,title,implementation_status,testing_status)')
      .eq('user_id', context.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceControlMapping = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => mappingSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await Promise.all([
      assertOwned(sb, 'compliance_obligations', context.userId, data.obligation_id, 'Obligation'),
      assertOwned(sb, 'compliance_controls', context.userId, data.control_id, 'Control'),
    ]);
    return insertOrUpdateOwned(sb, 'compliance_control_mappings', context.userId, data.id, {
      obligation_id: data.obligation_id,
      control_id: data.control_id,
      coverage: data.coverage,
      notes: nullable(data.notes),
    });
  });

export const deleteComplianceAssuranceRecord = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    table: z.enum(['compliance_applicability', 'compliance_assessments', 'compliance_evidence', 'compliance_control_mappings']),
    id: z.string().uuid(),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from(data.table).delete().eq('id', data.id).eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getComplianceAssuranceReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const [applicability, obligations, controls, mappings, assessments, evidence, findings] = await Promise.all([
      sb.from('compliance_applicability').select('id,status,confidence,next_review_on').eq('user_id', userId),
      sb.from('compliance_obligations').select('id,status,risk_level,due_on').eq('user_id', userId),
      sb.from('compliance_controls').select('id,implementation_status,testing_status').eq('user_id', userId),
      sb.from('compliance_control_mappings').select('id,obligation_id,control_id,coverage').eq('user_id', userId),
      sb.from('compliance_assessments').select('id,status,score').eq('user_id', userId),
      sb.from('compliance_evidence').select('id,obligation_id,control_id,assessment_id,valid_until,verification_status').eq('user_id', userId),
      sb.from('compliance_findings').select('id,status,severity,due_on').eq('user_id', userId),
    ]);
    for (const result of [applicability, obligations, controls, mappings, assessments, evidence, findings]) {
      if (result.error) throw new Error(result.error.message);
    }

    const applicabilityRows = applicability.data ?? [];
    const obligationRows = obligations.data ?? [];
    const controlRows = controls.data ?? [];
    const mappingRows = mappings.data ?? [];
    const assessmentRows = assessments.data ?? [];
    const evidenceRows = evidence.data ?? [];
    const findingRows = findings.data ?? [];
    const mappedObligations = new Set(mappingRows.filter((row: any) => row.coverage !== 'gap').map((row: any) => row.obligation_id));
    const evidenceControls = new Set(evidenceRows.filter((row: any) => row.verification_status === 'verified' && row.control_id).map((row: any) => row.control_id));
    const completeScores = assessmentRows.map((row: any) => Number(row.score)).filter((score: number) => Number.isFinite(score));
    const now = Date.now();
    const expiryWindow = now + 30 * 24 * 60 * 60 * 1000;

    return {
      applicability: {
        total: applicabilityRows.length,
        review: applicabilityRows.filter((row: any) => row.status === 'review').length,
        applicable: applicabilityRows.filter((row: any) => ['applicable', 'partially_applicable'].includes(row.status)).length,
      },
      obligations: {
        total: obligationRows.length,
        unmapped: obligationRows.filter((row: any) => row.status !== 'not_applicable' && !mappedObligations.has(row.id)).length,
        criticalOpen: obligationRows.filter((row: any) => row.risk_level === 'critical' && !['implemented', 'not_applicable'].includes(row.status)).length,
      },
      controls: {
        total: controlRows.length,
        operating: controlRows.filter((row: any) => row.implementation_status === 'operating').length,
        ineffective: controlRows.filter((row: any) => ['ineffective', 'partially_effective'].includes(row.testing_status)).length,
        withoutVerifiedEvidence: controlRows.filter((row: any) => !evidenceControls.has(row.id)).length,
      },
      assessments: {
        total: assessmentRows.length,
        open: assessmentRows.filter((row: any) => !['complete', 'archived'].includes(row.status)).length,
        averageScore: completeScores.length ? Math.round(completeScores.reduce((sum: number, score: number) => sum + score, 0) / completeScores.length) : null,
      },
      evidence: {
        total: evidenceRows.length,
        verified: evidenceRows.filter((row: any) => row.verification_status === 'verified').length,
        expiringWithin30Days: evidenceRows.filter((row: any) => {
          if (!row.valid_until) return false;
          const expires = new Date(row.valid_until).getTime();
          return Number.isFinite(expires) && expires >= now && expires <= expiryWindow;
        }).length,
        expired: evidenceRows.filter((row: any) => row.verification_status === 'expired' || (row.valid_until && new Date(row.valid_until).getTime() < now)).length,
      },
      findings: {
        total: findingRows.length,
        open: findingRows.filter((row: any) => !['resolved', 'closed'].includes(row.status)).length,
        criticalOpen: findingRows.filter((row: any) => row.severity === 'critical' && !['resolved', 'closed'].includes(row.status)).length,
      },
      generatedAt: new Date().toISOString(),
    };
  });
