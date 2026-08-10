import { Link2 } from 'lucide-react';
import { Panel } from './shared';
import { CONNECTED_ACCOUNTS } from './settingsData';

export default function ConnectedAccountsSection() {
  return (
    <Panel icon={Link2} title="Connected Accounts" grad="from-indigo-500 to-violet-500" desc="Link external services to your account.">
      <div className="space-y-2.5">
        {CONNECTED_ACCOUNTS.map((acc) => (
          <div key={acc.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-3">
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${acc.grad} text-sm font-semibold text-white`}>
                {acc.name[0]}
              </span>
              <div>
                <p className="text-xs font-medium text-white">{acc.name}</p>
                <p className="text-[10px] text-zinc-500">{acc.connected ? acc.email : 'Not connected'}</p>
              </div>
            </div>
            {acc.connected ? (
              <button className="rounded-lg border border-red-400/20 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-500/10">Disconnect</button>
            ) : (
              <button className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Connect</button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}