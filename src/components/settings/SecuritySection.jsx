import { ShieldCheck, KeyRound, Smartphone } from 'lucide-react';
import { Panel, ToggleRow } from './shared';

export default function SecuritySection({ data, update }) {
  return (
    <Panel icon={ShieldCheck} title="Security" grad="from-rose-500 to-red-500" desc="Authentication and account protection.">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-300" />
            <div>
              <p className="text-xs font-medium text-white">Password</p>
              <p className="text-[10px] text-zinc-500">Last changed 3 weeks ago</p>
            </div>
          </div>
          <button className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Change</button>
        </div>

        <ToggleRow label="Two-Factor Authentication" desc="Require a second factor at sign-in." checked={data.twoFactor} onChange={(v) => update('twoFactor', v)} />
        <ToggleRow label="Passkeys" desc="Use a passkey instead of a password." checked={data.passkeys} onChange={(v) => update('passkeys', v)} />
        <ToggleRow label="Login Alerts" desc="Email me about new sign-ins." checked={data.loginAlerts} onChange={(v) => update('loginAlerts', v)} />

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-xs font-medium text-white">Active sessions</p>
              <p className="text-[10px] text-zinc-500">3 devices signed in</p>
            </div>
          </div>
          <button className="rounded-lg border border-red-400/20 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-500/10">Sign out all</button>
        </div>
      </div>
    </Panel>
  );
}

export const initialSecurity = { twoFactor: true, passkeys: false, loginAlerts: true };