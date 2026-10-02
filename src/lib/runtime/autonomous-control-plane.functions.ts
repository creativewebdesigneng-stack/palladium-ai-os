import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'

type Sb = { from: (table: string) => any }

const ACTIVE_RUN_STATES = ['queued','planning','running','waiting_for_approval']

export const getAutonomousRuntimeControlPlane = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb
    const userId = context.userId
    const [controlRes, goalsRes, runsRes, workflowRunsRes] = await Promise.all([
      sb.from('autonomous_runtime_controls')
        .select('enabled,stop_reason,stopped_at,updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      sb.from('autonomous_goals')
        .select('id,status,trigger_type,next_run_at,scheduler_lease_until,last_scheduler_error')
        .eq('user_id', userId)
        .limit(500),
      sb.from('autonomous_goal_runs')
        .select('id,goal_id,status,workflow_run_id,heartbeat_at,started_at,created_at,error')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      sb.from('workflow_runs')
        .select('id,status,worker_heartbeat_at,queued_at,worker_attempts,worker_error,cancel_requested')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    for (const result of [controlRes, goalsRes, runsRes, workflowRunsRes]) {
      if (result.error) throw new Error(result.error.message)
    }

    const control = controlRes.data ?? { enabled: true, stop_reason: null, stopped_at: null, updated_at: null }
    const goals = goalsRes.data ?? []
    const runs = runsRes.data ?? []
    const workflowRuns = workflowRunsRes.data ?? []
    const now = Date.now()
    const staleAfterMs = 15 * 60 * 1000
    const activeRuns = runs.filter((run: any) => ACTIVE_RUN_STATES.includes(String(run.status)))
    const activeWorkflows = workflowRuns.filter((run: any) => ['pending','queued','running','waiting_for_approval'].includes(String(run.status)))
    const staleWorkflows = activeWorkflows.filter((run: any) => {
      if (run.status !== 'running') return false
      const heartbeat = Date.parse(String(run.worker_heartbeat_at ?? ''))
      return !Number.isFinite(heartbeat) || now - heartbeat > staleAfterMs
    })
    const heartbeatTimes = activeWorkflows
      .map((run: any) => Date.parse(String(run.worker_heartbeat_at ?? '')))
      .filter(Number.isFinite)
    const latestHeartbeat = heartbeatTimes.length ? new Date(Math.max(...heartbeatTimes)).toISOString() : null

    return {
      control: {
        enabled: control.enabled !== false,
        stopReason: control.stop_reason ?? null,
        stoppedAt: control.stopped_at ?? null,
        updatedAt: control.updated_at ?? null,
      },
      health: {
        activeGoals: goals.filter((goal: any) => goal.status === 'active').length,
        pausedGoals: goals.filter((goal: any) => goal.status === 'paused').length,
        dueGoals: goals.filter((goal: any) => goal.status === 'active' && goal.next_run_at && Date.parse(goal.next_run_at) <= now).length,
        activeAutonomousRuns: activeRuns.length,
        activeWorkflowRuns: activeWorkflows.length,
        staleWorkflowRuns: staleWorkflows.length,
        cancellationRequested: activeWorkflows.filter((run: any) => run.cancel_requested === true).length,
        latestHeartbeat,
        schedulerErrors: goals.filter((goal: any) => Boolean(goal.last_scheduler_error)).length,
      },
    }
  })

export const setAutonomousRuntimeEnabled = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    enabled: z.boolean(),
    reason: z.string().trim().max(300).nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const now = new Date().toISOString()
    const reason = data.enabled ? null : (data.reason?.trim() || 'Operator engaged the Autonomous OS master stop.')

    const { error: controlError } = await sb.from('autonomous_runtime_controls').upsert({
      user_id: context.userId,
      enabled: data.enabled,
      stop_reason: reason,
      stopped_at: data.enabled ? null : now,
      updated_at: now,
    }, { onConflict: 'user_id' })
    if (controlError) throw new Error(controlError.message)

    let cancelledRuns = 0
    let cancellationRequested = 0
    if (!data.enabled) {
      const { data: activeRuns, error: runError } = await sb.from('autonomous_goal_runs')
        .select('id,workflow_run_id')
        .eq('user_id', context.userId)
        .in('status', ACTIVE_RUN_STATES)
        .limit(500)
      if (runError) throw new Error(runError.message)

      const workflowRunIds = (activeRuns ?? [])
        .map((run: any) => run.workflow_run_id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)

      if (workflowRunIds.length) {
        const { data: workflowRows, error: workflowError } = await sb.from('workflow_runs')
          .update({
            cancel_requested: true,
            worker_error: 'Autonomous OS master stop engaged by the operator.',
            updated_at: now,
          })
          .eq('user_id', context.userId)
          .in('id', workflowRunIds)
          .in('status', ['pending','queued','running','waiting_for_approval'])
          .select('id')
        if (workflowError) throw new Error(workflowError.message)
        cancellationRequested = workflowRows?.length ?? 0
      }

      const { data: cancelled, error: cancelError } = await sb.from('autonomous_goal_runs')
        .update({
          status: 'cancelled',
          error: 'Autonomous OS master stop engaged by the operator.',
          heartbeat_at: now,
          completed_at: now,
        })
        .eq('user_id', context.userId)
        .in('status', ACTIVE_RUN_STATES)
        .select('id')
      if (cancelError) throw new Error(cancelError.message)
      cancelledRuns = cancelled?.length ?? 0
    }

    await writeAudit({
      userId: context.userId,
      action: data.enabled ? 'autonomous_runtime.master_start' : 'autonomous_runtime.master_stop',
      targetType: 'autonomous_runtime_control',
      targetId: context.userId,
      status: 'success',
      metadata: {
        reason,
        cancelledRuns,
        cancellationRequested,
      },
    })

    return {
      enabled: data.enabled,
      stoppedAt: data.enabled ? null : now,
      reason,
      cancelledRuns,
      cancellationRequested,
    }
  })
