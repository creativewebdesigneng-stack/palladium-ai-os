import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, KeyRound, Fingerprint, Activity, AlertTriangle } from 'lucide-react';
import { Panel, Field } from './shared';
import { useSessionReady } from '@/lib/useSessionReady';
import { getSecurityCentre } from '@/lib/security/security.functions';
import { supabase } from '@/integrations/supabase/client';
import { friendlyMessage } from '@/lib/errors';

function withSecurityTimeout(promise, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Security status did not respond within 15 seconds.')), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export default function SecuritySection() {
  const session = useSessionReady();
  const securityFn = useServerFn(getSecurityCentre);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const query = useQuery({
    queryKey: ['settings-security-centre'],
    queryFn: () => withSecurityTimeout(securityFn({ data: {} })),
    enabled: session === 'yes',
    retry: false,
  });

  const updatePassword = async () => {
    setPasswordMessage('');
    setPasswordError('');
    if (password.length < 12) { setPasswordError('Use at least 12 characters for your new password.'); return; }
    if (password !== confirm) { setPasswordError('The passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirm('');
      setPasswordMessage('Password updated successfully.');
    } catch (error) {
      setPasswordError(friendlyMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const account = query.data?.account;
  const metrics = query.data?.metrics ?? [];
  const alerts = query.data?.alerts ?? [];

  return (
    <Panel icon={ShieldCheck} title="Security" grad="from-rose-500 to-red-500" desc="Live account assurance, API security and audit posture.">
      {session === 'no' ? <p className="text-xs text-zinc-500">Sign in to view your security status.</p> :
        session === 'unknown' || query.isLoading ? <p role="status" className="text-xs text-zinc-500">Loading your security status…</p> :
        query.error ? <div role="alert" className="text-xs text-rose-300">{friendlyMessage(query.error)} <button onClick={() => query.refetch()} className="ml-2 underline">Retry</button></div> : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.slice(0, 4).map((metric) => (
                <div key={metric.key} className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">{metric.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
                  <p className="text-[10px] text-zinc-500">{metric.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white"><Fingerprint className="h-4 w-4 text-violet-300" />Authentication</div>
                <p className="mt-2 text-xs text-zinc-300">{account?.email || 'Signed-in account'}</p>
                <p className="mt-1 text-[11px] text-zinc-500">Email: {account?.emailVerified ? 'verified' : 'not verified'}</p>
                <p className="mt-1 text-[11px] text-zinc-500">Session assurance: {account?.aal?.toUpperCase() ?? 'Unknown'} · {account?.mfaEnabled ? 'second factor verified' : 'single factor'}</p>
                <p className="mt-1 text-[11px] text-zinc-500">Provider: {account?.provider ?? 'unknown'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white"><Activity className="h-4 w-4 text-violet-300" />Recent audit activity</div>
                <p className="mt-2 text-xl font-semibold text-white">{query.data?.auditTotal ?? 0}</p>
                <p className="text-[11px] text-zinc-500">Recorded events in the last 30 days.</p>
                <p className="mt-1 text-[11px] text-zinc-500">{alerts.length} current security alerts.</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white"><KeyRound className="h-4 w-4 text-violet-300" />Change password</div>
              <p className="mt-1 text-[11px] text-zinc-500">Updates the password for your current sign-in account. OAuth-only accounts may need to manage credentials with their identity provider.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="New password"><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" placeholder="At least 12 characters" /></Field>
                <Field label="Confirm password"><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" placeholder="Repeat new password" /></Field>
              </div>
              {passwordError && <p role="alert" className="mt-2 text-xs text-rose-300">{passwordError}</p>}
              {passwordMessage && <p role="status" className="mt-2 text-xs text-emerald-300">{passwordMessage}</p>}
              <button onClick={updatePassword} disabled={saving || !password || !confirm} className="mt-3 rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{saving ? 'Updating…' : 'Update password'}</button>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white"><AlertTriangle className="h-4 w-4 text-amber-300" />Multi-factor authentication</div>
              <p className="mt-1 text-[11px] text-zinc-500">{account?.mfaEnabled ? 'A second factor was verified for this session.' : 'No second factor was verified for this session. MFA enrolment and recovery management still require a dedicated account-provider flow; this panel does not claim MFA is enabled.'}</p>
            </div>
            {alerts.length > 0 && <div className="mt-4 space-y-2"><p className="text-xs font-semibold text-white">Current alerts</p>{alerts.slice(0, 5).map((alert) => <div key={alert.id} className="rounded-lg border border-amber-300/10 bg-amber-300/[.04] p-2.5"><p className="text-xs text-amber-100">{alert.title}</p><p className="mt-0.5 text-[10px] text-zinc-500">{alert.detail}</p></div>)}</div>}
          </>
        )}
    </Panel>
  );
}
