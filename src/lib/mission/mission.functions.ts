import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import {
  aiBriefing,
  emitWebhook,
  fallbackBriefing,
  prepareCheckoutDraft,
  routeRequest,
  runShoppingResearch,
} from './mission.server';

type Sb = { from: (t: string) => any; rpc?: unknown };

const DEFAULT_DOMAINS = [
  'amazon.co.uk', 'johnlewis.com', 'argos.co.uk', 'currys.co.uk', 'ikea.com',
  'booking.com', 'trainline.com', 'tesco.com', 'sainsburys.co.uk',
];

async function log(sb: Sb, userId: string, action: string, extra: Record<string, unknown> = {}) {
  await sb.from('mission_audit_logs').insert({
    user_id: userId,
    action,
    agent_id: (extra['agent_id'] as string | null) ?? null,
    target_type: (extra['target_type'] as string | null) ?? null,
    target_id: (extra['target_id'] as string | null) ?? null,
    status: (extra['status'] as string | null) ?? 'success',
    metadata: (extra['metadata'] as Record<string, unknown>) ?? {},
  });
}

async function activity(sb: Sb, userId: string, message: string, kind: string, extra: Record<string, unknown> = {}) {
  await sb.from('agent_activities').insert({
    user_id: userId,
    message,
    kind,
    agent_id: (extra['agent_id'] as string | null) ?? null,
    task_id: (extra['task_id'] as string | null) ?? null,
    metadata: (extra['metadata'] as Record<string, unknown>) ?? {},
  });
}

/* ------------------------------------------------------------------ overview */

export const getMissionOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [agents, tasks, approvals, activities, purchases, memories, shoppingResults, audit, notifications, usage, agentRuns] = await Promise.all([
      sb.from('personal_agents').select('*').order('created_at', { ascending: false }),
      sb.from('personal_tasks').select('*').order('created_at', { ascending: false }).limit(80),
      sb.from('approval_requests').select('*').order('created_at', { ascending: false }).limit(60),
      sb.from('agent_activities').select('*').order('created_at', { ascending: false }).limit(40),
      sb.from('purchase_requests').select('*').order('created_at', { ascending: false }).limit(40),
      sb.from('personal_memories').select('*').order('category', { ascending: true }),
      sb.from('shopping_results').select('*').order('created_at', { ascending: false }).limit(80),
      sb.from('mission_audit_logs').select('*').order('created_at', { ascending: false }).limit(30),
      sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(40),
      sb.from('usage_records').select('metric, quantity, unit, occurred_at').gte('occurred_at', monthStart.toISOString()).limit(500),
      sb.from('agent_tasks').select('status, tokens_in, tokens_out, cost_pence, created_at').order('created_at', { ascending: false }).limit(200),
    ]);


    const agentRows = agents.data ?? [];
    const taskRows = tasks.data ?? [];
    const approvalRows = approvals.data ?? [];

    const pendingApprovals = approvalRows.filter((a: any) => a.status === 'pending');
    const running = taskRows.filter((t: any) => t.status === 'running' || t.status === 'queued');
    const completed = taskRows.filter((t: any) => t.status === 'completed');
    const upcoming = taskRows.filter((t: any) => t.status === 'pending');

    const counts = {
      tasks: taskRows.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled').length,
      approvals: pendingApprovals.length,
      shopping: (shoppingResults.data ?? []).length,
      running: running.length,
      agents: agentRows.filter((a: any) => a.status === 'active').length,
    };

    const briefingFallback = fallbackBriefing(counts);
    const briefing = await aiBriefing(
      `Data: ${counts.tasks} open tasks, ${counts.approvals} pending approvals, ${counts.shopping} shopping results found, ${counts.running} running agent tasks, ${counts.agents} active agents.`,
      briefingFallback,
    );

    const notificationRows = notifications.data ?? [];
    const usageRows = usage.data ?? [];
    const runRows = agentRuns.data ?? [];

    const usageByMetric: Record<string, number> = {};
    for (const r of usageRows as any[]) {
      const key = String(r.metric);
      usageByMetric[key] = (usageByMetric[key] ?? 0) + Number(r.quantity ?? 0);
    }

    const tokensIn = runRows.reduce((sum: number, r: any) => sum + Number(r.tokens_in ?? 0), 0);
    const tokensOut = runRows.reduce((sum: number, r: any) => sum + Number(r.tokens_out ?? 0), 0);
    const costPence = runRows.reduce((sum: number, r: any) => sum + Number(r.cost_pence ?? 0), 0);

    return {
      briefing,
      agents: agentRows,
      tasks: taskRows,
      approvals: approvalRows,
      activities: activities.data ?? [],
      purchases: purchases.data ?? [],
      memories: memories.data ?? [],
      shoppingResults: shoppingResults.data ?? [],
      audit: audit.data ?? [],
      notifications: notificationRows,
      usage: {
        byMetric: usageByMetric,
        agentRuns: runRows.length,
        succeededRuns: runRows.filter((r: any) => r.status === 'succeeded').length,
        failedRuns: runRows.filter((r: any) => r.status === 'failed').length,
        tokensIn,
        tokensOut,
        costPence,
      },
      metrics: {
        activeAgents: counts.agents,
        totalAgents: agentRows.length,
        runningTasks: running.length,
        upcomingTasks: upcoming.length,
        awaitingApproval: pendingApprovals.length,
        completedTasks: completed.length,
        personalTasks: taskRows.filter((t: any) => t.scope === 'personal').length,
        professionalTasks: taskRows.filter((t: any) => t.scope === 'professional').length,
        failedTasks: taskRows.filter((t: any) => t.status === 'failed').length,
        unreadNotifications: notificationRows.filter((n: any) => !n.read_at).length,
      },
    };

  });

/* -------------------------------------------------------------------- agents */

type AgentInput = {
  id?: string;
  name: string;
  category: string;
  purpose?: string;
  personality?: string;
  instructions?: string;
  preferences?: Record<string, unknown>;
  budget_limit?: number | null;
  currency?: string;
  allowed_tools?: string[];
  requires_approval?: boolean;
  autonomy?: string;
  schedule?: string;
  scope?: string;
  allowed_domains?: string[];
};

export const savePersonalAgent = createServerFn({ method: 'POST' })
  .inputValidator((input: AgentInput) => {
    if (!input?.name?.trim()) throw new Error('Agent name is required');
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const autonomy = ['assist', 'prepare', 'execute', 'approval_required'].includes(data.autonomy ?? '')
      ? data.autonomy
      : 'prepare';
    const tools = data.allowed_tools ?? [];
    const row = {
      user_id: userId,
      name: data.name.trim(),
      category: data.category || 'custom',
      purpose: data.purpose ?? null,
      personality: data.personality ?? 'professional',
      instructions: data.instructions ?? null,
      preferences: data.preferences ?? {},
      budget_limit: data.budget_limit ?? null,
      currency: data.currency ?? 'GBP',
      allowed_tools: tools,
      // financial or account-changing tools always force approval, server-side
      requires_approval:
        tools.includes('checkout') || tools.includes('booking') || autonomy === 'approval_required'
          ? true
          : data.requires_approval ?? true,
      autonomy,
      schedule: data.schedule ?? null,
      scope: data.scope === 'professional' ? 'professional' : 'personal',
    };

    let saved: any;
    if (data.id) {
      const res = await sb.from('personal_agents').update(row).eq('id', data.id).eq('user_id', userId).select().maybeSingle();
      if (res.error) throw new Error(res.error.message);
      saved = res.data;
    } else {
      const res = await sb.from('personal_agents').insert(row).select().maybeSingle();
      if (res.error) throw new Error(res.error.message);
      saved = res.data;
    }
    if (!saved) throw new Error('Agent could not be saved');

    const domains = data.allowed_domains?.length ? data.allowed_domains : DEFAULT_DOMAINS;
    if (tools.length) {
      await sb.from('tool_permissions').upsert(
        tools.map((tool) => ({
          user_id: userId,
          agent_id: saved.id,
          tool,
          enabled: true,
          requires_approval: ['checkout', 'booking', 'email_draft'].includes(tool),
          allowed_domains: tool === 'browser' || tool === 'shopping_search' || tool === 'checkout' ? domains : [],
          spend_cap: tool === 'checkout' ? data.budget_limit ?? null : null,
        })),
        { onConflict: 'agent_id,tool' },
      );
    }

    await log(sb, userId, data.id ? 'agent_updated' : 'agent_created', { agent_id: saved.id, target_type: 'personal_agent', target_id: saved.id, metadata: { name: saved.name } });
    await activity(sb, userId, `${saved.name} ${data.id ? 'updated' : 'created'}`, 'agent_created', { agent_id: saved.id });
    return saved;
  });

export const deletePersonalAgent = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb.from('personal_agents').delete().eq('id', data.id).eq('user_id', context.userId);
    if (res.error) throw new Error(res.error.message);
    await log(sb, context.userId, 'agent_deleted', { target_type: 'personal_agent', target_id: data.id });
    return { ok: true };
  });

/* --------------------------------------------------------------------- tasks */

export const submitPersonalTask = createServerFn({ method: 'POST' })
  .inputValidator((input: { request: string; agentId?: string | null }) => {
    if (!input?.request?.trim()) throw new Error('Tell Mission Control what you need');
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const decision = routeRequest(data.request);

    // pick the agent: explicit choice, else best category match owned by the user
    const agentsRes = await sb.from('personal_agents').select('*').eq('user_id', userId);
    const agents: any[] = agentsRes.data ?? [];
    const agent =
      (data.agentId ? agents.find((a) => a.id === data.agentId) : null) ??
      agents.find((a) => a.category === decision.category && a.status === 'active') ??
      agents.find((a) => a.status === 'active') ??
      null;

    const budget = decision.budget ?? (agent?.budget_limit ? Number(agent.budget_limit) : null);
    const currency = agent?.currency ?? 'GBP';
    const requiresApproval = decision.requiresApproval || Boolean(agent?.requires_approval && decision.involvesMoney);

    const taskRes = await sb.from('personal_tasks').insert({
      user_id: userId,
      agent_id: agent?.id ?? null,
      request: data.request.trim(),
      title: decision.title,
      category: decision.category,
      scope: agent?.scope === 'professional' ? 'professional' : 'personal',
      status: 'running',
      requires_approval: requiresApproval,
      involves_money: decision.involvesMoney,
      required_tools: decision.requiredTools,
    }).select().maybeSingle();
    if (taskRes.error) throw new Error(taskRes.error.message);
    const task = taskRes.data;

    await activity(sb, userId, `Agent started: ${decision.title}`, 'task_started', { agent_id: agent?.id ?? null, task_id: task.id });
    await log(sb, userId, 'agent_executed', { agent_id: agent?.id ?? null, target_type: 'personal_task', target_id: task.id, metadata: { category: decision.category } });

    // shopping requests go through research → results → approval
    if (decision.category === 'shopping') {
      const allowedTools: string[] = agent?.allowed_tools?.length ? agent.allowed_tools : ['web_search', 'shopping_search', 'browser', 'checkout'];
      const permRes = agent ? await sb.from('tool_permissions').select('allowed_domains').eq('agent_id', agent.id) : { data: [] };
      const domains = [...new Set(((permRes.data ?? []) as any[]).flatMap((p) => p.allowed_domains ?? []))];
      const allowedDomains = domains.length ? (domains as string[]) : DEFAULT_DOMAINS;

      const shopRes = await sb.from('shopping_tasks').insert({
        user_id: userId,
        agent_id: agent?.id ?? null,
        task_id: task.id,
        requirement: data.request.trim(),
        budget,
        currency,
        status: 'running',
      }).select().maybeSingle();
      const shoppingTask = shopRes.data;

      await activity(sb, userId, 'Agent searching supported retailers…', 'searching', { agent_id: agent?.id ?? null, task_id: task.id });

      const { offers, steps, provider } = await runShoppingResearch({
        requirement: data.request,
        budget,
        currency,
        allowedDomains,
        allowedTools,
      });

      await sb.from('browser_sessions').insert({
        user_id: userId,
        agent_id: agent?.id ?? null,
        task_id: task.id,
        provider,
        allowed_domains: allowedDomains,
        status: 'completed',
        steps,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      });

      const insertRows = offers.map((o, i) => ({
        shopping_task_id: shoppingTask.id,
        product: o.product,
        price: o.price,
        currency: o.currency,
        seller: o.seller,
        delivery: o.delivery,
        delivery_cost: o.deliveryCost,
        rating: o.rating,
        url: o.url,
        specs: o.specs,
        reason: o.reason,
        in_stock: o.inStock,
        selected: i === 0,
      }));
      const resultsRes = await sb.from('shopping_results').insert(insertRows).select();
      const results: any[] = resultsRes.data ?? [];
      const best = results[0];

      await activity(sb, userId, `Agent found ${results.length} matching products`, 'results_found', { agent_id: agent?.id ?? null, task_id: task.id });
      await log(sb, userId, 'search_performed', { agent_id: agent?.id ?? null, target_type: 'shopping_task', target_id: shoppingTask.id, metadata: { results: results.length, budget } });

      if (best) {
        const draft = await prepareCheckoutDraft({
          offer: {
            product: best.product,
            price: Number(best.price),
            currency: best.currency,
            seller: best.seller,
            delivery: best.delivery,
            deliveryCost: Number(best.delivery_cost ?? 0),
            rating: Number(best.rating ?? 0),
            url: best.url,
            inStock: best.in_stock,
            specs: best.specs ?? {},
            reason: best.reason ?? '',
          },
          allowedDomains,
          allowedTools,
        });

        const approvalRes = await sb.from('approval_requests').insert({
          user_id: userId,
          agent_id: agent?.id ?? null,
          task_id: task.id,
          action_type: 'purchase',
          title: `Purchase: ${draft.product}`,
          summary: best.reason,
          details: { product: draft.product, seller: draft.seller, delivery: best.delivery, rating: best.rating, url: best.url, budget },
          estimated_cost: draft.total,
          currency: draft.currency,
          risk_level: draft.total > 500 ? 'high' : draft.total > 100 ? 'medium' : 'low',
          status: 'pending',
        }).select().maybeSingle();

        await sb.from('purchase_requests').insert({
          user_id: userId,
          shopping_task_id: shoppingTask.id,
          shopping_result_id: best.id,
          approval_request_id: approvalRes.data?.id ?? null,
          product: draft.product,
          seller: draft.seller,
          item_price: draft.itemPrice,
          delivery_cost: draft.deliveryCost,
          tax: draft.tax,
          fees: draft.fees,
          total: draft.total,
          currency: draft.currency,
          status: 'awaiting_approval',
          checkout_url: draft.checkoutUrl,
        });

        await sb.from('shopping_tasks').update({ status: 'awaiting_approval' }).eq('id', shoppingTask.id).eq('user_id', userId);
        await sb.from('personal_tasks').update({ status: 'awaiting_approval', result: { results: results.length, recommended: draft.product, total: draft.total } }).eq('id', task.id).eq('user_id', userId);
        await activity(sb, userId, `Agent waiting for approval: ${draft.product}`, 'awaiting_approval', { agent_id: agent?.id ?? null, task_id: task.id });
        await emitWebhook(userId, 'approval.required', { task_id: task.id, title: `Purchase: ${draft.product}`, action_type: 'purchase', estimated_cost: draft.total, currency: draft.currency });
        await log(sb, userId, 'purchase_prepared', { agent_id: agent?.id ?? null, target_type: 'purchase_request', target_id: approvalRes.data?.id ?? null, metadata: { total: draft.total } });
      }

      return { taskId: task.id, decision, shoppingTaskId: shoppingTask.id, results };
    }

    // sensitive but non-shopping requests are prepared and queued for approval
    if (requiresApproval) {
      await sb.from('approval_requests').insert({
        user_id: userId,
        agent_id: agent?.id ?? null,
        task_id: task.id,
        action_type: decision.category === 'travel' ? 'booking' : 'external_action',
        title: decision.title,
        summary: decision.reason,
        details: { request: data.request, tools: decision.requiredTools },
        estimated_cost: budget,
        currency,
        risk_level: decision.involvesMoney ? 'medium' : 'low',
        status: 'pending',
      });
      await emitWebhook(userId, 'approval.required', { task_id: task.id, title: decision.title, action_type: decision.category === 'travel' ? 'booking' : 'external_action', estimated_cost: budget, currency });
      await sb.from('personal_tasks').update({ status: 'awaiting_approval' }).eq('id', task.id).eq('user_id', userId);
      await activity(sb, userId, `Agent prepared an action awaiting approval: ${decision.title}`, 'awaiting_approval', { agent_id: agent?.id ?? null, task_id: task.id });
      return { taskId: task.id, decision };
    }

    await sb.from('personal_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: { summary: `${decision.category} request handled by ${agent?.name ?? 'Mission Control'}`, tools: decision.requiredTools },
    }).eq('id', task.id).eq('user_id', userId);
    await activity(sb, userId, `Agent completed research: ${decision.title}`, 'completed', { agent_id: agent?.id ?? null, task_id: task.id });
    return { taskId: task.id, decision };
  });

export const updateTaskStatus = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; status: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const allowed = ['pending', 'queued', 'running', 'completed', 'cancelled'];
    if (!allowed.includes(data.status)) throw new Error('Unsupported status');
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === 'completed') patch['completed_at'] = new Date().toISOString();
    const res = await sb.from('personal_tasks').update(patch).eq('id', data.id).eq('user_id', context.userId).select().maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

/* ----------------------------------------------------------------- approvals */

export const decideApproval = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; decision: 'approve' | 'reject'; note?: string }) => {
    if (input.decision !== 'approve' && input.decision !== 'reject') throw new Error('Invalid decision');
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    // server-side validation: the request must exist, belong to the caller and still be pending
    const current = await sb.from('approval_requests').select('*').eq('id', data.id).eq('user_id', userId).maybeSingle();
    const approval = current.data;
    if (!approval) throw new Error('Approval request not found');
    if (approval.status !== 'pending') throw new Error('This request has already been decided');

    const status = data.decision === 'approve' ? 'approved' : 'rejected';
    await sb.from('approval_requests').update({
      status,
      decided_at: new Date().toISOString(),
      decided_by: userId,
      decision_note: data.note ?? null,
    }).eq('id', data.id).eq('user_id', userId);

    const purchase = await sb.from('purchase_requests').select('*').eq('approval_request_id', data.id).eq('user_id', userId).maybeSingle();
    if (purchase.data) {
      await sb.from('purchase_requests').update({
        status: data.decision === 'approve' ? 'approved_awaiting_checkout' : 'rejected',
      }).eq('id', purchase.data.id).eq('user_id', userId);
    }

    if (approval.task_id) {
      await sb.from('personal_tasks').update({
        status: data.decision === 'approve' ? 'running' : 'cancelled',
      }).eq('id', approval.task_id).eq('user_id', userId);
    }

    await activity(sb, userId, `${data.decision === 'approve' ? 'You approved' : 'You rejected'}: ${approval.title}`, data.decision === 'approve' ? 'approved' : 'rejected', { agent_id: approval.agent_id, task_id: approval.task_id });
    await log(sb, userId, data.decision === 'approve' ? 'purchase_approved' : 'purchase_rejected', {
      agent_id: approval.agent_id,
      target_type: 'approval_request',
      target_id: approval.id,
      status,
      metadata: { action_type: approval.action_type, estimated_cost: approval.estimated_cost },
    });

    return { status, purchase: purchase.data ?? null };
  });

export const chooseAlternative = createServerFn({ method: 'POST' })
  .inputValidator((input: { approvalId: string; resultId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const approvalRes = await sb.from('approval_requests').select('*').eq('id', data.approvalId).eq('user_id', userId).maybeSingle();
    const approval = approvalRes.data;
    if (!approval || approval.status !== 'pending') throw new Error('Approval request is not open');

    const purchaseRes = await sb.from('purchase_requests').select('*').eq('approval_request_id', data.approvalId).eq('user_id', userId).maybeSingle();
    const purchase = purchaseRes.data;
    if (!purchase) throw new Error('No prepared purchase for this request');

    const resultRes = await sb.from('shopping_results').select('*').eq('id', data.resultId).maybeSingle();
    const result = resultRes.data;
    if (!result || result.shopping_task_id !== purchase.shopping_task_id) throw new Error('Product not available for this task');

    const draft = await prepareCheckoutDraft({
      offer: {
        product: result.product,
        price: Number(result.price),
        currency: result.currency,
        seller: result.seller,
        delivery: result.delivery,
        deliveryCost: Number(result.delivery_cost ?? 0),
        rating: Number(result.rating ?? 0),
        url: result.url,
        inStock: result.in_stock,
        specs: result.specs ?? {},
        reason: result.reason ?? '',
      },
      allowedDomains: DEFAULT_DOMAINS,
      allowedTools: ['browser', 'shopping_search', 'checkout'],
    });

    await sb.from('shopping_results').update({ selected: false }).eq('shopping_task_id', purchase.shopping_task_id);
    await sb.from('shopping_results').update({ selected: true }).eq('id', result.id);
    await sb.from('purchase_requests').update({
      shopping_result_id: result.id,
      product: draft.product,
      seller: draft.seller,
      item_price: draft.itemPrice,
      delivery_cost: draft.deliveryCost,
      tax: draft.tax,
      fees: draft.fees,
      total: draft.total,
      currency: draft.currency,
      checkout_url: draft.checkoutUrl,
      status: 'awaiting_approval',
    }).eq('id', purchase.id).eq('user_id', userId);

    await sb.from('approval_requests').update({
      title: `Purchase: ${draft.product}`,
      summary: result.reason,
      estimated_cost: draft.total,
      details: { product: draft.product, seller: draft.seller, delivery: result.delivery, rating: result.rating, url: result.url },
      risk_level: draft.total > 500 ? 'high' : draft.total > 100 ? 'medium' : 'low',
    }).eq('id', data.approvalId).eq('user_id', userId);

    await log(sb, userId, 'product_selected', { agent_id: approval.agent_id, target_type: 'shopping_result', target_id: result.id, metadata: { total: draft.total } });
    await activity(sb, userId, `Agent prepared an alternative: ${draft.product}`, 'awaiting_approval', { agent_id: approval.agent_id, task_id: approval.task_id });
    return { ok: true };
  });

/** Final checkout gate: requires a server-verified approval before handing the user to checkout. */
export const confirmPurchase = createServerFn({ method: 'POST' })
  .inputValidator((input: { purchaseId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const purchaseRes = await sb.from('purchase_requests').select('*').eq('id', data.purchaseId).eq('user_id', userId).maybeSingle();
    const purchase = purchaseRes.data;
    if (!purchase) throw new Error('Purchase request not found');

    const approvalRes = await sb.from('approval_requests').select('*').eq('id', purchase.approval_request_id).eq('user_id', userId).maybeSingle();
    if (approvalRes.data?.status !== 'approved') throw new Error('This purchase has not been approved by you yet');

    await sb.from('purchase_requests').update({
      status: 'checkout_ready',
      checkout_reference: `PD-${Date.now().toString(36).toUpperCase()}`,
    }).eq('id', purchase.id).eq('user_id', userId);

    if (purchase.shopping_task_id) {
      await sb.from('shopping_tasks').update({ status: 'completed' }).eq('id', purchase.shopping_task_id).eq('user_id', userId);
    }
    if (approvalRes.data.task_id) {
      await sb.from('personal_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', approvalRes.data.task_id).eq('user_id', userId);
    }

    await log(sb, userId, 'external_action_executed', { target_type: 'purchase_request', target_id: purchase.id, metadata: { total: purchase.total, seller: purchase.seller } });
    await activity(sb, userId, `Checkout ready for ${purchase.product} — you complete payment`, 'action_completed', { task_id: approvalRes.data.task_id });

    await emitWebhook(userId, 'purchase.completed', {
      purchase_id: purchase.id,
      product: purchase.product,
      seller: purchase.seller,
      total: purchase.total,
      currency: purchase.currency,
      checkout_url: purchase.checkout_url,
    });
    if (approvalRes.data.task_id) {
      await emitWebhook(userId, 'task.completed', { task_id: approvalRes.data.task_id, source: 'purchase' });
    }

    return { checkoutUrl: purchase.checkout_url, total: purchase.total, currency: purchase.currency };
  });

/* -------------------------------------------------------------------- memory */

export const saveMemory = createServerFn({ method: 'POST' })
  .inputValidator((input: { id?: string; category: string; key: string; value: string }) => {
    if (!input?.key?.trim()) throw new Error('A label is required');
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = { user_id: context.userId, category: data.category || 'general', key: data.key.trim(), value: data.value ?? '' };
    const res = data.id
      ? await sb.from('personal_memories').update(row).eq('id', data.id).eq('user_id', context.userId).select().maybeSingle()
      : await sb.from('personal_memories').insert(row).select().maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const deleteMemory = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb.from('personal_memories').delete().eq('id', data.id).eq('user_id', context.userId);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

export const clearMemoryCategory = createServerFn({ method: 'POST' })
  .inputValidator((input: { category: string }) => {
    if (!input?.category) throw new Error('A category is required');
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb.from('personal_memories').delete().eq('user_id', context.userId).eq('category', data.category);
    if (res.error) throw new Error(res.error.message);
    await log(sb, context.userId, 'memory_category_cleared', { metadata: { category: data.category } });
    return { ok: true };
  });

/* ------------------------------------------------------------- notifications */

export const markNotifications = createServerFn({ method: 'POST' })
  .inputValidator((input: { id?: string; all?: boolean }) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let q = sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', context.userId).is('read_at', null);
    if (!data.all && data.id) q = q.eq('id', data.id);
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });
