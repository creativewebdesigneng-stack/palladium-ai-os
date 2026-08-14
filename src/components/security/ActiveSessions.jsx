import { motion } from 'framer-motion';
import { MonitorSmartphone, MapPin, ShieldCheck, History } from 'lucide-react';
import { SectionHead } from './shared';
import { dateTime, timeAgo } from './format';

function deviceLabel(ua = '') {
  if (/iPhone|Android.*Mobile/i.test(ua)) return 'Mobile device';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux machine';
  return 'This device';
}

function browserLabel(ua = '') {
  const m =
    ua.match(/(Edg|Chrome|Firefox|Safari)\/([\d.]+)/) ||
    [];
  if (!m.length) return 'Unknown browser';
  return `${m[1] === 'Edg' ? 'Edge' : m[1]} ${String(m[2]).split('.')[0]}`;
}

/**
 * Session view. Supabase does not expose other browsers' sessions to the
 * account holder, so this shows the verified current session plus the real
 * sign-in and access trail from the audit log — no invented devices.
 */
export default function ActiveSessions({ account, events = [], query = '' }) {
  const q = query.trim().toLowerCase();
  const trail = events.filter(
    (e) =>
      /login|sign|session|auth/i.test(e.action || '') &&
      (!q || `${e.action} ${e.ip} ${e.resource}`.toLowerCase().includes(q)),
  );

  return (
    <div className="space-y-5">
      <div>
        <SectionHead icon={MonitorSmartphone} title="Current Session" grad="from-sky-500 to-blue-500" count={1} />
        <div className="flex flex-col gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500">
              <MonitorSmartphone className="h-5 w-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{deviceLabel(account?.userAgent)}</p>
                <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                  This device
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {browserLabel(account?.userAgent)} · {account?.email || 'signed in'}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-600">
                <MapPin className="h-3 w-3" />
                {account?.ip || 'IP not disclosed'}
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-zinc-500">
            <p className="flex items-center justify-end gap-1 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Assurance {String(account?.aal || 'aal1').toUpperCase()}
            </p>
            <p className="mt-1">Signed in {timeAgo(account?.issuedAt)}</p>
            <p>Expires {dateTime(account?.sessionExpiresAt)}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-zinc-600">
          Sessions on other devices are managed by the identity provider. Changing your password ends every other session.
        </p>
      </div>

      <div>
        <SectionHead icon={History} title="Sign-in & Access Trail" grad="from-cyan-500 to-sky-500" count={trail.length} />
        {trail.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-xs text-zinc-500">
            No sign-in or session events recorded yet.
          </p>
        ) : (
          <motion.div layout className="space-y-2">
            {trail.slice(0, 20).map((e, i) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  e.result === 'failed' ? 'border-amber-400/20 bg-amber-400/[.03]' : 'border-white/10 bg-white/[.025]'
                }`}
              >
                <div className="min-w-0">
                  <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-violet-300">{e.action}</code>
                  <p className="mt-1 truncate text-[11px] text-zinc-500">
                    {e.resource} · {e.ip}
                  </p>
                </div>
                <p className={`shrink-0 text-[11px] ${e.result === 'failed' ? 'text-amber-300' : 'text-zinc-500'}`}>
                  {timeAgo(e.created_at)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
