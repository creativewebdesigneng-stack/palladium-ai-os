import { Globe, Lock, Network, Plus, Star } from 'lucide-react';
import { DOMAINS, DOMAIN_STATUS_STYLE, SSL_STYLE, DNS_STYLE } from './deploymentsData';

export default function DomainsPanel({ onToast }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Domains</h3>
        <button onClick={() => onToast?.('Add domain form opened')} className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white"><Plus className="h-3.5 w-3.5" />Add domain</button>
      </div>
      <div className="space-y-2">
        {DOMAINS.map((d) => (
          <div key={d.domain} className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-zinc-400" />
              <span className="text-[12px] font-medium text-white">{d.domain}</span>
              {d.primary && <span className="flex items-center gap-1 rounded bg-amber-400/15 px-1.5 py-px text-[9px] font-medium text-amber-300"><Star className="h-2.5 w-2.5" />Primary</span>}
              <span className={`ml-auto rounded-full border px-2 py-px text-[10px] font-medium ${DOMAIN_STATUS_STYLE[d.status]}`}>{d.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
              <div className="rounded-lg border border-white/5 bg-white/[.02] px-2.5 py-2">
                <div className="flex items-center gap-1 text-zinc-500"><Lock className="h-3 w-3" />SSL</div>
                <p className={`mt-0.5 font-medium ${SSL_STYLE[d.ssl]}`}>{d.ssl}</p>
                <p className="text-zinc-600">{d.sslExpiry}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[.02] px-2.5 py-2">
                <div className="flex items-center gap-1 text-zinc-500"><Network className="h-3 w-3" />DNS</div>
                <p className={`mt-0.5 font-medium ${DNS_STYLE[d.dns]}`}>{d.dns}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[.02] px-2.5 py-2">
                <div className="text-zinc-500">Status</div>
                <p className="mt-0.5 font-medium text-zinc-300">{d.status}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}