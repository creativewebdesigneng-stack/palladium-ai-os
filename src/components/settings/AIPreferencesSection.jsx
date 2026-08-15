import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, Loader2, Server, Sparkles, TriangleAlert } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { getAIPreferences, updateAIPreferences } from '@/lib/ai/ai-preferences.functions';
import { Field, Panel, TextInput } from './shared';

export default function AIPreferencesSection() {
  const qc = useQueryClient();
  const getFn = useServerFn(getAIPreferences);
  const updateFn = useServerFn(updateAIPreferences);
  const q = useQuery({ queryKey: ['ai-preferences'], queryFn: () => getFn(), retry: false });
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');

  const configuredProviders = useMemo(() => (q.data?.providers ?? []).filter((item) => item.configured), [q.data]);
  const selected = configuredProviders.find((item) => item.id === provider);

  useEffect(() => {
    if (!q.data) return;
    const initialProvider = q.data.preference?.provider || q.data.effective?.provider || configuredProviders[0]?.id || '';
    const option = (q.data.providers ?? []).find((item) => item.id === initialProvider);
    setProvider(initialProvider);
    setModel(q.data.preference?.model || q.data.effective?.model || option?.defaultModel || '');
  }, [q.data, configuredProviders]);

  const mutation = useMutation({
    mutationFn: () => updateFn({ data: { provider, model } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ai-preferences'] });
      toast({ title: 'AI preference saved', description: 'New workspace chat turns will use this provider and model.' });
    },
    onError: (error) => {
      console.error('[AIPreferences]', error);
      toast({ title: 'Could not save AI preference', description: friendlyMessage(error), variant: 'destructive' });
    },
  });

  const savedProvider = q.data?.preference?.provider || q.data?.effective?.provider || '';
  const savedModel = q.data?.preference?.model || q.data?.effective?.model || '';
  const dirty = provider !== savedProvider || model.trim() !== savedModel;

  const changeProvider = (nextProvider) => {
    setProvider(nextProvider);
    const option = configuredProviders.find((item) => item.id === nextProvider);
    if (option) setModel(option.defaultModel);
  };

  if (q.isLoading) {
    return (
      <Panel icon={Sparkles} title="AI Preferences" grad="from-violet-500 to-indigo-500" desc="Defaults used by live workspace chat.">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading your AI defaults…</div>
      </Panel>
    );
  }

  if (q.error) {
    return (
      <Panel icon={Sparkles} title="AI Preferences" grad="from-violet-500 to-indigo-500" desc="Defaults used by live workspace chat.">
        <div className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-4 text-xs text-rose-200"><TriangleAlert className="h-4 w-4 shrink-0" /><span>{friendlyMessage(q.error)}</span></div>
      </Panel>
    );
  }

  return (
    <Panel icon={Sparkles} title="AI Preferences" grad="from-violet-500 to-indigo-500" desc="Defaults used by live workspace chat.">
      <div className="space-y-4">
        {configuredProviders.length === 0 ? (
          <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-4 text-xs text-amber-100">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <div><p className="font-medium">No AI provider is configured</p><p className="mt-1 text-amber-100/70">Configure a provider on the deployment before choosing a personal default.</p></div>
          </div>
        ) : (
          <>
            <Field label="Default provider" hint="Used for new workspace chat turns">
              <select value={provider} onChange={(event) => changeProvider(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/40">
                {configuredProviders.map((item) => <option key={item.id} value={item.id} className="bg-zinc-900">{item.name}</option>)}
              </select>
            </Field>

            <Field label="Default model" hint="Provider model ID sent to the live runtime">
              <TextInput value={model} onChange={setModel} placeholder={selected?.defaultModel || 'Model ID'} />
            </Field>

            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-200"><CheckCircle2 className="h-4 w-4" />Live runtime setting</div>
              <p className="mt-1 text-[11px] leading-5 text-zinc-400">Saving this changes the provider/model resolved by the authenticated workspace assistant. Existing agent records keep their own model assignments.</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500"><Server className="h-3.5 w-3.5" />Effective now: <code className="text-violet-200">{q.data?.effective?.provider} · {q.data?.effective?.model}</code>{q.data?.effective?.source === 'deployment' && !q.data?.preference ? ' (deployment default)' : ''}</div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-[11px] text-zinc-500">{dirty ? 'You have unsaved AI default changes.' : 'Your AI defaults are saved.'}</p>
              <button onClick={() => mutation.mutate()} disabled={!dirty || !provider || !model.trim() || mutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save AI defaults
              </button>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
