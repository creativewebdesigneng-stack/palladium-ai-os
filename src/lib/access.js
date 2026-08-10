import { useState, useEffect } from 'react';

// Development-only mock access layer. Frontend-only — replace with real
// auth + billing before production. See README / AGENTS notes.
export const DEV_ADMIN_EMAIL = 'admin@palladiumai.local';
export const DEV_ADMIN_PASSWORD = 'password4321';

const DEV_FLAG = 'palladium.devAdmin';
const SUB_FLAG = 'palladium.subscription';

export const DEV_ADMIN_USER = {
  id: 'dev-admin',
  email: DEV_ADMIN_EMAIL,
  full_name: 'Dev Admin',
  role: 'admin',
};

export function isDevAdminSession() {
  try { return localStorage.getItem(DEV_FLAG) === 'true'; } catch { return false; }
}
export function activateDevAdmin() {
  try { localStorage.setItem(DEV_FLAG, 'true'); } catch {}
}
export function clearDevAdmin() {
  try { localStorage.removeItem(DEV_FLAG); } catch {}
}
export function isDevAdminEmail(email) {
  return !!email && email.toLowerCase() === DEV_ADMIN_EMAIL;
}

export function hasActiveSubscription() {
  try { return localStorage.getItem(SUB_FLAG) === 'active'; } catch { return false; }
}
export function setSubscriptionActive() {
  try { localStorage.setItem(SUB_FLAG, 'active'); } catch {}
}
export function clearSubscription() {
  try { localStorage.removeItem(SUB_FLAG); localStorage.removeItem(PLAN_FLAG); localStorage.removeItem(PLAN_STATUS_FLAG); } catch {}
}

const PLAN_FLAG = 'palladium.plan';
const PLAN_STATUS_FLAG = 'palladium.subscription_status';

// Freemium model: persisted plan + status for the demo build. Replace with
// backend User.subscription_plan / subscription_status when billing is live.
export function setSubscriptionPlan(plan, status = 'active') {
  try {
    localStorage.setItem(PLAN_FLAG, plan);
    localStorage.setItem(PLAN_STATUS_FLAG, status);
    if (plan !== 'free') setSubscriptionActive();
  } catch {}
}
export function getStoredPlan() {
  try { return localStorage.getItem(PLAN_FLAG) || ''; } catch { return ''; }
}
export function getStoredPlanStatus() {
  try { return localStorage.getItem(PLAN_STATUS_FLAG) || ''; } catch { return ''; }
}

export function canAccessDashboard(email) {
  // Freemium model: every authenticated user can enter on the Free "Explorer"
  // plan. Dev admins always pass. Paid capabilities are gated per-feature via
  // the permissions system (see src/lib/permissions.js), not at the route level.
  return true;
}

// Lightweight reactive hook for access state.
export function useAccess(email) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick(t => t + 1);
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);
  return {
    isDevAdmin: isDevAdminEmail(email),
    hasSubscription: hasActiveSubscription(),
    canAccess: canAccessDashboard(email),
  };
}