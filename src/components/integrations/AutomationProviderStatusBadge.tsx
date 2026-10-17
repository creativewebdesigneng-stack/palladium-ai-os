type ProviderStatus = { configured: boolean; state?: string };

export default function AutomationProviderStatusBadge({ provider, loading = false, error = false }: {
  provider?: ProviderStatus | undefined;
  loading?: boolean;
  error?: boolean;
}) {
  const label = loading ? 'Checking…'
    : error || !provider ? 'Status unavailable'
    : provider.state === 'adapter_required' ? 'Adapter required'
    : provider.configured ? 'Settings present' : 'Needs connection';
  const configured = !loading && !error && provider?.configured && !provider.state;
  return <span className={`rounded-full border px-2 py-1 text-[10px] ${configured ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>{label}</span>;
}
