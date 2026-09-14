import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

type Sb = { from: (table: string) => any };

const reviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'in_review', 'assessed', 'dismissed']),
  applicability_status: z.enum(['review', 'applicable', 'partially_applicable', 'not_applicable', 'out_of_scope']).optional().nullable(),
  owner_name: z.string().trim().max(180).optional().default(''),
  notes: z.string().trim().max(12000).optional().default(''),
  due_on: z.string().trim().max(32).optional().default(''),
});

function nullable(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

export const listComplianceChangeReviews = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from('compliance_change_reviews')
      .select(`
        *,
        profile:compliance_profiles(id,name),
        alert:compliance_alerts(id,name,minimum_severity),
        change:compliance_regulatory_changes(
          id,change_type,severity,detected_at,effective_at,summary,authoritative,review_required,
          regulation:compliance_regulations(
            id,title,jurisdiction,status,canonical_url,regulator_reference,
            source:compliance_regulatory_sources(id,regulator,title,canonical_url)
          )
        )
      `)
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveComplianceChangeReview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => reviewSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: review, error: reviewError } = await sb
      .from('compliance_change_reviews')
      .select('id,user_id,profile_id,change_id')
      .eq('id', data.id)
      .eq('user_id', context.userId)
      .maybeSingle();
    if (reviewError || !review) throw new Error('Regulatory change review not found.');

    const { data: change, error: changeError } = await sb
      .from('compliance_regulatory_changes')
      .select('id,regulation_id')
      .eq('id', review.change_id)
      .maybeSingle();
    if (changeError || !change) throw new Error('Regulatory change evidence not found.');

    if (review.profile_id) {
      const { data: profile, error } = await sb
        .from('compliance_profiles')
        .select('id')
        .eq('id', review.profile_id)
        .eq('user_id', context.userId)
        .maybeSingle();
      if (error || !profile) throw new Error('Compliance profile not found.');
    }

    const now = new Date().toISOString();
    const payload = {
      status: data.status,
      applicability_status: data.applicability_status ?? null,
      owner_name: nullable(data.owner_name),
      notes: nullable(data.notes),
      due_on: nullable(data.due_on),
      reviewed_at: ['assessed', 'dismissed'].includes(data.status) ? now : null,
    };
    const { data: updated, error: updateError } = await sb
      .from('compliance_change_reviews')
      .update(payload)
      .eq('id', data.id)
      .eq('user_id', context.userId)
      .select()
      .single();
    if (updateError) throw new Error(updateError.message);

    if (data.applicability_status && data.status === 'assessed') {
      let existingQuery = sb
        .from('compliance_applicability')
        .select('id')
        .eq('user_id', context.userId)
        .eq('regulation_id', change.regulation_id);
      existingQuery = review.profile_id
        ? existingQuery.eq('profile_id', review.profile_id)
        : existingQuery.is('profile_id', null);
      const { data: existing, error: existingError } = await existingQuery.limit(1).maybeSingle();
      if (existingError) throw new Error(existingError.message);

      const applicabilityPayload = {
        profile_id: review.profile_id ?? null,
        regulation_id: change.regulation_id,
        status: data.applicability_status,
        rationale: nullable(data.notes),
        determination_source: 'human_review',
        reviewed_by: nullable(data.owner_name),
        reviewed_at: now,
        next_review_on: null,
      };
      if (existing?.id) {
        const { error } = await sb
          .from('compliance_applicability')
          .update(applicabilityPayload)
          .eq('id', existing.id)
          .eq('user_id', context.userId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sb
          .from('compliance_applicability')
          .insert({ ...applicabilityPayload, user_id: context.userId });
        if (error) throw new Error(error.message);
      }
    }

    if (['assessed', 'dismissed'].includes(data.status)) {
      const { error: notificationError } = await sb
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', context.userId)
        .contains('metadata', { compliance_review_id: data.id });
      if (notificationError) throw new Error(notificationError.message);
    }

    return updated;
  });

export const deleteComplianceChangeReview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from('compliance_change_reviews')
      .delete()
      .eq('id', data.id)
      .eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
