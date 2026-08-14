import { motion } from 'framer-motion';
import { Lock, Mail, Fingerprint, KeyRound, Globe } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { SectionHead, StatusPill } from './shared';
import { dateTime } from './format';

// Authentication facts come from the verified session claims, not from any
// stored UI state: sign-in providers, assurance level and email verification.
export default function Authentication({ account }) {
  if (!account) return null;

  const providers = account.providers?.length ? account.providers : [account.provider].filter(Boolean);

  const methods = [
    {
      id: 'email',
      name: 'Email Address',
      icon: Mail,
      grad: 'from-sky-500 to-blue-500',
      status: account.emailVerified ? 'enabled' : 'disabled',
      desc: account.email
        ? `${account.email} · ${account.emailVerified ? 'verified' : 'not verified'}`
        : 'No email address on this account',
    },
    {
      id: 'providers',
      name: 'Sign-in Methods',
      icon: Globe,
      grad: 'from-cyan-500 to-sky-500',
      status: providers.length ? 'enabled' : 'disabled',
      desc: providers.length ? providers.join(', ') : 'No provider recorded on this session',
    },
    {
      id: 'mfa',
      name: 'Multi-Factor Authentication',
      icon: Fingerprint,
      grad: 'from-violet-500 to-indigo-500',
      status: account.mfaEnabled ? 'enabled' : 'disabled',
      desc: account.mfaEnabled
        ? 'This session was verified with a second factor (aal2)'
        : 'This session used a single factor (aal1)',
    },
    {
      id: 'password',
      name: 'Password',
      icon: Lock,
      grad: 'from-emerald-500 to-teal-500',
      status: providers.includes('password') ? 'enabled' : 'disabled',
      desc: providers.includes('password')
        ? 'Password sign-in is active for this account'
        : 'This account signs in with a federated provider',
    },
    {
      id: 'session',
      name: 'Session Assurance',
      icon: KeyRound,
      grad: 'from-amber-500 to-orange-500',
      status: 'enabled',
      desc: `Level ${String(account.aal || 'aal1').toUpperCase()} · expires ${dateTime(account.sessionExpiresAt)}`,
    },
  ];

  return (
    <div>
      <SectionHead
        icon={Lock}
        title="Authentication"
        grad="from-violet-500 to-indigo-500"
        count={`${methods.length} checks`}
        action={
          <Link
            to="/settings"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
          >
            Account settings
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {methods.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.grad} shadow-lg`}>
              <m.icon className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{m.name}</p>
                <StatusPill status={m.status} />
              </div>
              <p className="mt-0.5 break-words text-[11px] text-zinc-500">{m.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
