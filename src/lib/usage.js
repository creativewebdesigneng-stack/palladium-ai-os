import { useState, useEffect } from 'react';
import { getPlanKey } from '@/lib/permissions';

// Dynamic usage tracking for PalladiumAI. Stores this-month usage counts in
// localStorage and exposes a reactive `useUsage` hook plus `trackUsage` to
// record events (agent executions, workflow runs, API calls, etc.). Limits
// come from the user's plan via `getPlanLimits`. Swap the localStorage store
// for backend usage counters when billing/analytics are live — the component
// API (useUsage / trackUsage / getPlanLimits) stays the same.

const USAGE_KEY = 'palladium.usage';
const listeners = new Set();
let cache = null;

function read() {
  if (cache) return cache;
  try {
    const v = localStorage.getItem(USAGE_KEY);
    cache = v ? JSON.parse(v) : null;
  } catch { cache = null; }
  return cache;
}
function write(v) {
  cache = v;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(v)); } catch {}
  listeners.forEach((l) => l());
}

export const USAGE_METRIC_LABELS = {
  activeAgents: 'Active AI Agents',
  agentExecutions: 'Agent Executions',
  aiModelUsage: 'AI Model Usage',
  workflowRuns: 'Workflow Runs',
  memory: 'Memory Usage',
  storage: 'Workspace Storage',
  apiCalls: 'API Calls',
  toolUsage: 'Tool Usage',
};

// Plan limits across all tracked metrics. `null` = unlimited. Top tiers scale
// dramatically so they read as infrastructure, not credit bundles.
// Canonical four-tier plan limits (Free / Pro / Business / Enterprise). Numbers
// align with pricingPlans.jsx and permissions.getUsageLimits so there is a
// single source of truth. `null` = unlimited. Stale legacy keys (basic,
// professional, enterprise-plus) were removed when the tiers collapsed to four.
const PLAN_LIMITS = {
  free: { activeAgents: 0, agentExecutions: 0, aiModelUsage: 0, workflowRuns: 0, memory: 0.5, storage: 1, apiCalls: 0, toolUsage: 0 },
  pro: { activeAgents: 5, agentExecutions: 500, aiModelUsage: 2000, workflowRuns: 100, memory: 2, storage: 5, apiCalls: 1000, toolUsage: 100 },
  business: { activeAgents: 50, agentExecutions: 50000, aiModelUsage: 250000, workflowRuns: 25000, memory: 50, storage: 100, apiCalls: 500000, toolUsage: 10000 },
  enterprise: { activeAgents: 200, agentExecutions: 250000, aiModelUsage: 2000000, workflowRuns: null, memory: 250, storage: 500, apiCalls: 3000000, toolUsage: 50000 },
};

export function getPlanLimits(user) {
  const key = getPlanKey(user);
  return PLAN_LIMITS[key] || PLAN_LIMITS.free;
}

function seed(limits) {
  const round = (v, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f; };
  return {
    _seeded: true,
    activeAgents: limits.activeAgents ? Math.round(limits.activeAgents * 0.43) : 0,
    agentExecutions: limits.agentExecutions ? Math.round(limits.agentExecutions * 0.18) : 0,
    aiModelUsage: limits.aiModelUsage ? Math.round(limits.aiModelUsage * 0.22) : 0,
    workflowRuns: limits.workflowRuns ? Math.round(limits.workflowRuns * 0.30) : 0,
    memory: limits.memory ? round(limits.memory * 0.40, 2) : 0,
    storage: limits.storage ? round(limits.storage * 0.24, 2) : 0,
    apiCalls: limits.apiCalls ? Math.round(limits.apiCalls * 0.15) : 0,
    toolUsage: limits.toolUsage ? Math.round(limits.toolUsage * 0.20) : 0,
  };
}

export function getUsage() { return read(); }
export function setUsage(v) { write(v); }
export function trackUsage(metric, delta = 1) {
  const v = read() || {};
  v[metric] = (v[metric] || 0) + delta;
  write(v);
}
export function resetUsage() { write({}); }

export function useUsage(user) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    const v = read();
    if (!v || !v._seeded) write(seed(getPlanLimits(user)));
    return () => listeners.delete(l);
  }, [user]);
  return read() || {};
}