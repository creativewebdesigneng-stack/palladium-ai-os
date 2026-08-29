import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(500).optional(),
  weight: z.number().min(0).max(2000).optional(),
});

export const getFitnessOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [profile, workouts, weights] = await Promise.all([
      sb.from('fitness_profiles').select('*').eq('user_id', context.userId).maybeSingle(),
      sb.from('fitness_workouts').select('*').eq('user_id', context.userId).order('scheduled_for', { ascending: false }).limit(40),
      sb.from('fitness_weight_entries').select('*').eq('user_id', context.userId).order('recorded_on', { ascending: false }).limit(60),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (workouts.error) throw new Error(workouts.error.message);
    if (weights.error) throw new Error(weights.error.message);
    return { profile: profile.data, workouts: workouts.data ?? [], weights: weights.data ?? [] };
  });

export const saveFitnessProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ goal: z.string().trim().max(500).optional(), units: z.enum(['metric','imperial']) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('fitness_profiles').upsert({ user_id: context.userId, goal: data.goal || null, units: data.units, updated_at: new Date().toISOString() }).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createFitnessWorkout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(120), scheduledFor: z.string().trim().max(20).optional(), notes: z.string().trim().max(2000).optional(), exercises: z.array(exerciseSchema).min(1).max(30) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('fitness_workouts').insert({ user_id: context.userId, name: data.name, scheduled_for: data.scheduledFor || null, notes: data.notes || null, exercises: data.exercises }).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error('Workout could not be created.');
    await writeAudit({ userId: context.userId, action: 'fitness.workout_created', targetType: 'fitness_workout', targetId: row.id });
    return row;
  });

export const recordFitnessWeight = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ weight: z.number().positive().max(2000), recordedOn: z.string().trim().min(8).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('fitness_weight_entries').upsert({ user_id: context.userId, weight: data.weight, recorded_on: data.recordedOn }, { onConflict: 'user_id,recorded_on' }).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
