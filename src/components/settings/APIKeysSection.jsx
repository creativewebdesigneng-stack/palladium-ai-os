import { Link } from 'react-router-dom';
import { KeyRound, ArrowRight } from 'lucide-react';
import { Panel } from './shared';

export default function APIKeysSection() {
  return (
    <Panel icon={KeyRound} title="API Keys" grad="from-sky-500 to-cyan-500" desc="Programmatic credentials are managed in the live Developer Portal.">
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] p-4">
        <p className="text-sm font-medium text-white">API key management is available</p>
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          Create, rotate and revoke workspace API keys in Developer Portal. Newly created secrets are shown once and stored hashed server-side.
        </p>
        <Link to="/developer-portal" className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[.08]">
          Open Developer Portal <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Panel>
  );
}
