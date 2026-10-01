import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bot, Brain, History, Loader2, MapPin, Radio, Sparkles, Workflow } from 'lucide-react';
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
  const [conversationHistoryEnabled, setConversationHistoryEnabled] = useState(true);
  const [memoryContextEnabled, setMemoryContextEnabled] = useState(true);
  const [workspaceContextEnabled, setWorkspaceContextEnabled] = useState(true);
  const [liveWebEnabled, setLiveWebEnabled] = useState(true);
  const [responseStyle, setResponseStyle] = useState('balanced');

  useEffect(() => {
    if (!q.data) return;
    const p = q.data.preferences;
    setAssistantName(p.assistantName || 'Blackstar');
    setLocationName(p.locationName || '');
    setTimezone(p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    setWelcomeEnabled(p.welcomeEnabled !== false);
    setBriefingEnabled(p.briefingEnabled !== false);
    setConversationHistoryEnabled(p.conversationHistoryEnabled !== false);
    setMemoryContextEnabled(p.memoryContextEnabled !== false);
    setWorkspaceContextEnabled(p.workspaceContextEnabled !== false);
    setLiveWebEnabled(p.liveWebEnabled !== false);
    setResponseStyle(p.responseStyle || 'balanced');
  }, [q.data]);

  const mutation = useMutation({
    mutationFn: () => updateFn({ data: {
      assistantName: assistantName.trim(),
      locationName: locationName.trim() || null,
      timezone: timezone.trim() || null,
      welcomeEnabled,
      briefingEnabled,
      conversationHistoryEnabled,
      memoryContextEnabled,
      workspaceContextEnabled,
      liveWebEnabled,
      responseStyle,
    } }),
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
    briefingEnabled !== saved.briefingEnabled ||
    conversationHistoryEnabled !== saved.conversationHistoryEnabled ||
    memoryContextEnabled !== saved.memoryContextEnabled ||
    workspaceContextEnabled !== saved.workspaceContextEnabled ||
    liveWebEnabled !== saved.liveWebEnabled ||
    responseStyle !== (saved.responseStyle || 'balanced')
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
          <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-300" />
              <div>
                <p className="text-sm font-medium text-white">Conversation & context</p>
                <p className="mt-0.5 text-[10px] text-zinc-600">Choose which owner-scoped context the assistant may use. Conversation history is not the same as long-term memory.</p>
              </div>
            </div>
            <div className="space-y-2">
              <ToggleRow label="Conversation history" desc="Keep and restore your assistant threads across sessions." checked={conversationHistoryEnabled} onChange={setConversationHistoryEnabled} />
              <ToggleRow label="Memory & knowledge context" desc="Recall relevant owner-visible memories and indexed knowledge, subject to your separate Memory privacy settings." checked={memoryContextEnabled} onChange={setMemoryContextEnabled} />
              <ToggleRow label="Workspace context" desc="Use recent tasks, workflows, approvals, notifications and authorised agent discovery." checked={workspaceContextEnabled} onChange={setWorkspaceContextEnabled} />
              <ToggleRow label="Live web grounding" desc="Allow current-information lookups for time-sensitive questions." checked={liveWebEnabled} onChange={setLiveWebEnabled} />
            </div>
          </div>
          <Field label="Response style" hint="Controls default answer depth; you can still ask for more or less detail in any conversation.">
            <select value={responseStyle} onChange={(e) => setResponseStyle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/30">
              <option value="concise">Concise</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><History className="h-3.5 w-3.5 text-violet-300" /><p className="mt-2 text-[10px] font-medium text-zinc-300">Durable threads</p><p className="mt-1 text-[9px] leading-4 text-zinc-600">Resume prior conversations without relying on browser state.</p></div>
            <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><Workflow className="h-3.5 w-3.5 text-sky-300" /><p className="mt-2 text-[10px] font-medium text-zinc-300">Workspace aware</p><p className="mt-1 text-[9px] leading-4 text-zinc-600">Reads current work without granting new execution permission.</p></div>
            <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"><Radio className="h-3.5 w-3.5 text-emerald-300" /><p className="mt-2 text-[10px] font-medium text-zinc-300">Current when needed</p><p className="mt-1 text-[9px] leading-4 text-zinc-600">Live-web grounding can be switched off independently.</p></div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-[11px] text-zinc-500">{dirty ? 'You have unsaved assistant changes.' : 'Assistant preferences are saved.'}</p>
            <button onClick={() => mutation.mutate()} disabled={!dirty || !assistantName.trim() || mutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save assistant</button>
          </div>
        </div>
      )}
    </Panel>
  );
}
