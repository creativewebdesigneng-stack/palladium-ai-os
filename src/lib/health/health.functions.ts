import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { writeAudit } from '@/lib/platform/audit.server';

type Sb = { from: (table: string) => any };

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const jsonList = z.array(z.string().trim().min(1).max(160)).max(100).optional().default([]);

const profileSchema = z.object({
  goal: optionalText(1000),
  units: z.enum(['metric','imperial']).default('metric'),
  activity_level: z.enum(['sedentary','light','moderate','active','very_active']).default('moderate'),
  date_of_birth: z.string().date().optional().or(z.literal('')),
  height_cm: z.number().min(50).max(280).optional(),
  dietary_preferences: jsonList,
  allergies: jsonList,
  conditions: jsonList,
  accessibility_notes: optionalText(2000),
});

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(30),
  reps: z.number().int().min(1).max(1000).optional(),
  weight: z.number().min(0).max(3000).optional(),
  duration_minutes: z.number().min(0).max(1440).optional(),
});

function nullify(value?: string) { return value?.trim() ? value.trim() : null; }

export const getHealthOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [profile, goals, metrics, workouts, nutrition, sleep, medications] = await Promise.all([
      sb.from('health_profiles').select('*').eq('user_id', context.userId).maybeSingle(),
      sb.from('health_goals').select('*').eq('user_id', context.userId).order('updated_at', { ascending: false }).limit(100),
      sb.from('health_metric_entries').select('*').eq('user_id', context.userId).order('recorded_at', { ascending: false }).limit(300),
      sb.from('health_workouts').select('*').eq('user_id', context.userId).order('scheduled_for', { ascending: false }).limit(100),
      sb.from('health_nutrition_entries').select('*').eq('user_id', context.userId).order('eaten_at', { ascending: false }).limit(200),
      sb.from('health_sleep_entries').select('*').eq('user_id', context.userId).order('sleep_end', { ascending: false }).limit(100),
      sb.from('health_medications').select('*').eq('user_id', context.userId).order('active', { ascending: false }).order('updated_at', { ascending: false }).limit(100),
    ]);
    const failed = [profile, goals, metrics, workouts, nutrition, sleep, medications].find((result: any) => result.error)?.error;
    if (failed) throw new Error(failed.message);
    const metricRows = metrics.data ?? [];
    const latestWeight = metricRows.find((item: any) => item.metric_type === 'weight') ?? null;
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recentSleep = (sleep.data ?? []).filter((item: any) => new Date(item.sleep_end).getTime() >= sevenDaysAgo);
    const averageSleepHours = recentSleep.length
      ? recentSleep.reduce((sum: number, item: any) => sum + (new Date(item.sleep_end).getTime() - new Date(item.sleep_start).getTime()) / 3600000, 0) / recentSleep.length
      : null;
    const weekWorkouts = (workouts.data ?? []).filter((item: any) => {
      const stamp = item.completed_at ?? item.started_at ?? item.scheduled_for;
      return stamp && new Date(stamp).getTime() >= sevenDaysAgo;
    }).length;
    return {
      profile: profile.data,
      goals: goals.data ?? [],
      metrics: metricRows,
      workouts: workouts.data ?? [],
      nutrition: nutrition.data ?? [],
      sleep: sleep.data ?? [],
      medications: medications.data ?? [],
      summary: {
        latestWeight: latestWeight ? { value: Number(latestWeight.value), unit: String(latestWeight.unit), recorded_at: String(latestWeight.recorded_at) } : null,
        averageSleepHours: averageSleepHours === null ? null : Math.round(averageSleepHours * 10) / 10,
        workoutsLast7Days: weekWorkouts,
        activeGoals: (goals.data ?? []).filter((item: any) => item.status === 'active').length,
        activeMedications: (medications.data ?? []).filter((item: any) => item.active).length,
      },
    };
  });

export const saveHealthProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => profileSchema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('health_profiles').upsert({
      user_id: context.userId,
      goal: nullify(data.goal),
      units: data.units,
      activity_level: data.activity_level,
      date_of_birth: nullify(data.date_of_birth),
      height_cm: data.height_cm ?? null,
      dietary_preferences: data.dietary_preferences,
      allergies: data.allergies,
      conditions: data.conditions,
      accessibility_notes: nullify(data.accessibility_notes),
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, action: 'health.profile_updated', targetType: 'health_profile', targetId: context.userId });
    return row;
  });

export const saveHealthGoal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    category: z.enum(['fitness','strength','cardio','mobility','nutrition','sleep','recovery','weight','habit','general_health']),
    title: z.string().trim().min(1).max(160),
    target_value: z.number().optional(),
    target_unit: optionalText(40),
    target_date: z.string().date().optional().or(z.literal('')),
    notes: optionalText(2000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('health_goals').insert({
      user_id: context.userId, category: data.category, title: data.title,
      target_value: data.target_value ?? null, target_unit: nullify(data.target_unit),
      target_date: nullify(data.target_date), notes: nullify(data.notes), status: 'active',
    }).select('*').single();
    if (error) throw new Error(error.message);
    return row;
  });

export const recordHealthMetric = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    metric_type: z.enum(['weight','resting_heart_rate','heart_rate','hrv','steps','blood_pressure_systolic','blood_pressure_diastolic','blood_glucose','body_fat','waist','temperature','oxygen_saturation','hydration','mood','energy','pain','other']),
    value: z.number().finite(),
    unit: z.string().trim().min(1).max(32),
    recorded_at: z.string().datetime({ offset: true }).optional(),
    notes: optionalText(1000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('health_metric_entries').insert({
      user_id: context.userId, metric_type: data.metric_type, value: data.value, unit: data.unit,
      recorded_at: data.recorded_at ?? new Date().toISOString(), source: 'manual', notes: nullify(data.notes),
    }).select('*').single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createHealthWorkout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    name: z.string().trim().min(1).max(120),
    workout_type: z.enum(['strength','cardio','mobility','sport','recovery','mixed','other']).default('strength'),
    scheduled_for: z.string().date().optional().or(z.literal('')),
    duration_minutes: z.number().int().min(0).max(1440).optional(),
    notes: optionalText(3000),
    exercises: z.array(exerciseSchema).min(1).max(50),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('health_workouts').insert({
      user_id: context.userId, name: data.name, workout_type: data.workout_type,
      scheduled_for: nullify(data.scheduled_for), duration_minutes: data.duration_minutes ?? null,
      notes: nullify(data.notes), exercises: data.exercises, source: 'manual',
    }).select('*').single();
    if (error) throw new Error(error.message);
    await writeAudit({ userId: context.userId, action: 'health.workout_created', targetType: 'health_workout', targetId: row.id });
    return row;
  });

export const logHealthNutrition = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    meal_type: z.enum(['breakfast','lunch','dinner','snack','drink','meal']).default('meal'),
    name: z.string().trim().min(1).max(240),
    eaten_at: z.string().datetime({ offset: true }).optional(),
    calories: z.number().min(0).max(20000).optional(),
    protein_g: z.number().min(0).optional(),
    carbs_g: z.number().min(0).optional(),
    fat_g: z.number().min(0).optional(),
    fibre_g: z.number().min(0).optional(),
    water_ml: z.number().min(0).optional(),
    notes: optionalText(2000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('health_nutrition_entries').insert({
      user_id: context.userId, ...data, eaten_at: data.eaten_at ?? new Date().toISOString(), notes: nullify(data.notes),
    }).select('*').single();
    if (error) throw new Error(error.message);
    return row;
  });

export const logHealthSleep = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    sleep_start: z.string().datetime({ offset: true }),
    sleep_end: z.string().datetime({ offset: true }),
    quality: z.number().min(0).max(10).optional(),
    awake_minutes: z.number().int().min(0).max(1440).optional(),
    notes: optionalText(2000),
  }).superRefine((data, ctx) => {
    if (new Date(data.sleep_end) <= new Date(data.sleep_start)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sleep end must be after sleep start.' });
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('health_sleep_entries').insert({
      user_id: context.userId, sleep_start: data.sleep_start, sleep_end: data.sleep_end,
      quality: data.quality ?? null, awake_minutes: data.awake_minutes ?? null, source: 'manual', notes: nullify(data.notes),
    }).select('*').single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveHealthMedication = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    name: z.string().trim().min(1).max(240),
    dose: optionalText(160), schedule: optionalText(240), purpose: optionalText(500),
    prescribed_by: optionalText(240), started_on: z.string().date().optional().or(z.literal('')),
    active: z.boolean().default(true), notes: optionalText(2000),
  }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from('health_medications').insert({
      user_id: context.userId, name: data.name, dose: nullify(data.dose), schedule: nullify(data.schedule),
      purpose: nullify(data.purpose), prescribed_by: nullify(data.prescribed_by), started_on: nullify(data.started_on),
      active: data.active, notes: nullify(data.notes),
    }).select('*').single();
    if (error) throw new Error(error.message);
    return row;
  });
