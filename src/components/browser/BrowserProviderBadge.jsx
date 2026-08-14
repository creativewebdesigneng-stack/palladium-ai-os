import { ShieldAlert, FlaskConical, Globe } from 'lucide-react';

/**
 * Honest browser-provider status. Only ever renders "Production Connected" when
 * the server confirmed credentials AND a live health probe, so the UI never
 * claims a working browser that does not exist.
 */
const STATES = {
  production_connected: {
    label: 'Production Connected',
    icon: Globe,
    tone: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  },
  development_simulation: {
    label: 'Development Simulation',
    icon: FlaskConical,
    tone: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  },
  not_configured: {
    label: 'Not configured',
    icon: ShieldAlert,
    tone: 'border-rose-400/25 bg-rose-500/10 text-rose-300',
  },
};

export default function BrowserProviderBadge({ browser, compact = false }) {
  const state = STATES[browser?.state] ?? STATES.not_configured;
  const Icon = state.icon;
  return (
    <span
      title={browser?.detail || ''}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${state.tone}`}
    >
      <Icon className="h-3 w-3" />
      Browser Provider: {state.label}
      {!compact && browser?.label && browser.state === 'production_connected' && (
        <span className="text-emerald-200/70">· {browser.label}</span>
      )}
    </span>
  );
}

export function BrowserProviderNotice({ browser }) {
  if (!browser) return null;
  const state = STATES[browser.state] ?? STATES.not_configured;
  return (
    <div
      className={`mb-4 rounded-2xl border p-4 text-xs ${
        browser.state === 'production_connected'
          ? 'border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200'
          : browser.state === 'development_simulation'
            ? 'border-amber-400/20 bg-amber-500/[.06] text-amber-200'
            : 'border-rose-400/20 bg-rose-500/[.06] text-rose-200'
      }`}
    >
      <p className="font-semibold">Browser Provider: {state.label}</p>
      <p className="mt-1 opacity-80">{browser.detail}</p>
      {(browser.providers || []).length > 0 && (
        <ul className="mt-2 space-y-1 opacity-70">
          {browser.providers.map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.label}</span> · {p.kind} ·{' '}
              {p.configured ? 'credentials present' : 'credentials missing'}
              {p.requires?.length ? ` (${p.requires.join(', ')})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
