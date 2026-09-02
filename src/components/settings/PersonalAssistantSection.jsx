import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bot, Loader2, MapPin, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import { getPersonalAssistantPreferences, updatePersonalAssistantPreferences } from '@/lib/ai/personal-assistant.functions';
import { Field, Panel, TextInput, ToggleRow } from './shared';

export default function PersonalAssistantSection() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPersonalAssistantPreferences);
  const updateFn = useServerFn(updatePersonalAssistantPreferences);
  const q = useQuery({ queryKey: ['personal-assistant-preferences'], queryFn: () => getFn(), retry: false });
  const [assistantName, setAssistantName] = useState('Blackstar');
  const [locationName, setLocationName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [briefingEnabled, setBriefingEnabled] = useState(true);

  useEffect(() => {
    if (!q.data) return;
    const p = q.data.preferences;
    setAssistantName(p.assistantName || 'Blackstar');
    setLocationName(p.locationName || '');
    setTimezone(p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    setWelcomeEnabled(p.welcomeEnabled !== false);
    setBriefingEnabled(p.briefingEnabled !== false);
  }, [q.data]);

  const mutation = useMutation({
    mutationFn: () => updateFn({ data: { assistantName: assistantName.trim(), locationName: locationName.trim() || null, timezone: timezone.trim() || null, welcomeEnabled, briefingEnabled } }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['personal-assistant-preferences'] }),
        qc.invalidateQueries({ queryKey: ['assistant-observability'] }),
      ]);
      toast({ title: `${assistantName.trim()} is ready`, description: 'Your personal assistant identity and dashboard briefing preferences are saved.' });
    },
    onError: (error) => toast({ title: 'Could not save assistant settings', description: friendlyMessage(error), variant: 'destructive' }),
  });

  const saved = q.data?.preferences;
  const dirty = Boolean(saved) && (
    assistantName.trim() !== (saved.assistantName || 'Blackstar') ||
    locationName.trim() !== (saved.locationName || '') ||
    timezone.trim() !== (saved.timezone || '') ||
    welcomeEnabled !== saved.welcomeEnabled ||
    briefingEnabled !== saved.briefingEnabled
  );

  return (
    <Panel icon={Bot} title="Personal Assistant" grad="from-violet-500 to-indigo-500" desc="Name your assistant and choose how it welcomes and briefs you.">
      {q.isLoading ? <div className="flex items-center gap-2 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading assistant profile…</div> : q.error ? <p className="text-xs text-rose-300">{friendlyMessage(q.error)}</p> : (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-300/10 bg-violet-400/[.035] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><Sparkles className="h-4 w-4 text-violet-300" />{assistantName || 'Blackstar'}</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-500">This name is used in dashboard welcomes and in the assistant's own identity. Your account name remains <span className="text-zinc-300">{q.data?.profile?.full_name || q.data?.profile?.email || 'your profile'}</span>.</p>
          </div>
          <Field label="Assistant name" hint="Any name you prefer"><TextInput value={assistantName} onChange={setAssistantName} placeholder="Blackstar" /></Field>
          <Field label="Your location" hint="Used for local context, weather and recommendations"><TextInput value={locationName} onChange={setLocationName} placeholder="e.g. London, United Kingdom" /></Field>
          <Field label="Timezone" hint="Used for greetings and local-time briefings"><TextInput value={timezone} onChange={setTimezone} placeholder="e.g. Europe/London" /></Field>
          <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-zinc-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />Location is account-private and is only used to personalise assistant context and local answers.</div>
          <ToggleRow label="Dashboard welcome" desc="Greet me by name when I open the dashboard." checked={welcomeEnabled} onChange={setWelcomeEnabled} />
          <ToggleRow label="Live workspace briefing" desc="Show running work, notifications, approvals, failures and recent progress." checked={briefingEnabled} onChange={setBriefingEnabled} />
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-[11px] text-zinc-500">{dirty ? 'You have unsaved assistant changes.' : 'Assistant preferences are saved.'}</p>
            <button onClick={() => mutation.mutate()} disabled={!dirty || !assistantName.trim() || mutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save assistant</button>
          </div>
        </div>
      )}
    </Panel>
  );
}
