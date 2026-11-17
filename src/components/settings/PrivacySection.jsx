import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Lock } from 'lucide-react';
import { Panel, ToggleRow, SaveBar, Select } from './shared';
import { useSessionReady } from '@/lib/useSessionReady';
import { getMemoryPreferences, updateMemoryPreferences } from '@/lib/memory/memory.functions';
import { friendlyMessage } from '@/lib/errors';

const DEFAULTS = {
  auto_capture: true,
  capture_sensitive: false,
  short_term_enabled: true,
  long_term_enabled: true,
  document_memory_enabled: true,
  organisation_sharing_enabled: false,
  short_term_ttl_minutes: 720,
  retention_days: null,
};

export default function PrivacySection() {
  const session = useSessionReady();
  const queryClient = useQueryClient();
  const getFn = useServerFn(getMemoryPreferences);
  const saveFn = useServerFn(updateMemoryPreferences);
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  const query = useQuery({
    queryKey: ['settings-memory-privacy'],
    queryFn: () => getFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
  });

  useEffect(() => {
    if (query.data?.preferences) {
      setPreferences({ ...DEFAULTS, ...query.data.preferences });
      setDirty(false);
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: preferences }),
    onSuccess: (result) => {
      setPreferences({ ...DEFAULTS, ...result.preferences });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['settings-memory-privacy'] });
    },
  });

  const update = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  return (
    <Panel icon={Lock} title="Privacy & Memory" grad="from-emerald-500 to-teal-500" desc="Control what Blackstar may retain in your personal and workspace memory.">
      {session === 'no' ? <p className="text-xs text-zinc-500">Sign in to manage your privacy preferences.</p> :
        session === 'unknown' || query.isLoading ? <p role="status" className="text-xs text-zinc-500">Loading your privacy preferences…</p> :
        query.error ? <div role="alert" className="text-xs text-rose-300">{friendlyMessage(query.error)} <button onClick={() => query.refetch()} className="ml-2 underline">Retry</button></div> : (
          <>
            <div className="space-y-2">
              <ToggleRow label="Automatic memory capture" desc="Allow eligible conversations to be considered for memory." checked={preferences.auto_capture} onChange={(value) => update('auto_capture', value)} />
              <ToggleRow label="Sensitive memory" desc="Allow sensitive personal details to be retained. Off by default." checked={preferences.capture_sensitive} onChange={(value) => update('capture_sensitive', value)} />
              <ToggleRow label="Short-term memory" desc="Allow temporary context with an expiry." checked={preferences.short_term_enabled} onChange={(value) => update('short_term_enabled', value)} />
              <ToggleRow label="Long-term memory" desc="Allow eligible information to persist beyond the short-term window." checked={preferences.long_term_enabled} onChange={(value) => update('long_term_enabled', value)} />
              <ToggleRow label="Document memory" desc="Allow private documents to be indexed for your own knowledge retrieval." checked={preferences.document_memory_enabled} onChange={(value) => update('document_memory_enabled', value)} />
              <ToggleRow label="Organisation memory sharing" desc="Allow eligible memory to be shared with your organisation. Off by default." checked={preferences.organisation_sharing_enabled} onChange={(value) => update('organisation_sharing_enabled', value)} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><p className="mb-1.5 text-xs font-medium text-zinc-300">Short-term retention</p><Select value={String(preferences.short_term_ttl_minutes)} onChange={(value) => update('short_term_ttl_minutes', Number(value))} options={['60','720','1440','10080','43200']} /></div>
              <div><p className="mb-1.5 text-xs font-medium text-zinc-300">Long-term retention</p><Select value={preferences.retention_days == null ? '0' : String(preferences.retention_days)} onChange={(value) => update('retention_days', value === '0' ? null : Number(value))} options={['0','30','90','365','730','3650']} /></div>
            </div>
            <p className="mt-2 text-[10px] text-zinc-600">Short-term choices: 1 hour, 12 hours, 1 day, 7 days or 30 days. Long-term “No automatic expiry” follows your account's deletion and retention policies. These controls govern Blackstar memory; they do not change third-party model-provider training or account analytics settings.</p>
            {save.error && <p role="alert" className="mt-3 text-xs text-rose-300">{friendlyMessage(save.error)}</p>}
            <div className="mt-4"><SaveBar dirty={dirty} onSave={() => save.mutate()} /></div>
          </>
        )}
    </Panel>
  );
}
