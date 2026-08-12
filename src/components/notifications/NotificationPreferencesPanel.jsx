import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BellRing, LayoutGrid, Monitor, Eye, Loader2 } from 'lucide-react';
import { Panel, Toggle } from './shared';
import { toast } from '@/components/ui/use-toast';
import { friendlyMessage } from '@/lib/errors';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '@/lib/notifications/notifications.functions';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPES,
  SEVERITY_LABELS,
} from '@/lib/notifications/types';

const CHANNELS = [
  {
    key: 'in_app',
    label: 'In-app',
    desc: 'Notifications inside PalladiumAI.',
    icon: LayoutGrid,
    grad: 'from-violet-500 to-indigo-500',
  },
  {
    key: 'browser_push',
    label: 'Browser',
    desc: 'Desktop alerts when the tab is in the background.',
    icon: Monitor,
    grad: 'from-emerald-500 to-teal-500',
  },
  {
    key: 'browser_push_details',
    label: 'Show details in browser alerts',
    desc: 'Off keeps titles and content inside the app only.',
    icon: Eye,
    grad: 'from-sky-500 to-cyan-500',
  },
];

/**
 * Real notification preferences, stored per user on the backend.
 * Browser permission is only ever requested when the user turns the channel on.
 */
export default function NotificationPreferencesPanel({ compact = false }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getNotificationPreferences);
  const saveFn = useServerFn(saveNotificationPreferences);
  const [draft, setDraft] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => getFn({ data: {} }),
    retry: false,
  });

  useEffect(() => { if (data) setDraft(data); }, [data]);

  const save = useMutation({
    mutationFn: (next) => saveFn({ data: next }),
    onSuccess: (saved) => {
      setDraft(saved);
      qc.setQueryData(['notification-preferences'], saved);
      toast({ title: 'Preferences saved' });
    },
    onError: (e) => {
      console.error('[notification-preferences]', e);
      setDraft(data ?? DEFAULT_NOTIFICATION_PREFERENCES);
      toast({ title: 'Could not save preferences', description: friendlyMessage(e), variant: 'destructive' });
    },
  });

  const prefs = draft ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const commit = async (patch) => {
    let next = { ...prefs, ...patch };
    if (patch.browser_push === true && typeof window !== 'undefined' && 'Notification' in window) {
      const permission = window.Notification.permission === 'granted'
        ? 'granted'
        : await window.Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: 'Browser alerts blocked',
          description: 'Allow notifications in your browser settings to enable this channel.',
          variant: 'destructive',
        });
        next = { ...next, browser_push: false };
      }
    }
    if (!next.browser_push) next.browser_push_details = false;
    setDraft(next);
    save.mutate(next);
  };

  const toggleType = (type) => {
    const muted = prefs.muted_types.includes(type)
      ? prefs.muted_types.filter((t) => t !== type)
      : [...prefs.muted_types, type];
    commit({ muted_types: muted });
  };

  return (
    <Panel
      icon={BellRing}
      title="Notification Settings"
      grad="from-violet-500 to-indigo-500"
      desc="Control how and where you are notified."
      action={save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" /> : null}
    >
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-rose-300">{friendlyMessage(error)}</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              const disabled = c.key === 'browser_push_details' && !prefs.browser_push;
              return (
                <div
                  key={c.key}
                  className={`flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 ${disabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${c.grad}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-white">{c.label}</p>
                      <p className="text-[10px] text-zinc-500">{c.desc}</p>
                    </div>
                  </div>
                  <Toggle
                    checked={!!prefs[c.key]}
                    onChange={(v) => { if (!disabled) commit({ [c.key]: v }); }}
                  />
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
            <p className="text-xs font-medium text-white">Minimum importance</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SEVERITY_LABELS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => commit({ min_severity: s.value })}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] ring-1 transition ${
                    prefs.min_severity === s.value
                      ? 'bg-violet-500/20 text-violet-200 ring-violet-400/30'
                      : 'bg-white/[.03] text-zinc-400 ring-white/10 hover:bg-white/5'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border border-white/10 bg-black/20 p-3.5 ${compact ? '' : ''}`}>
            <p className="text-xs font-medium text-white">Events</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Turn off any event you do not want to hear about.</p>
            <div className={`mt-2.5 grid gap-1.5 ${compact ? '' : 'sm:grid-cols-2'}`}>
              {NOTIFICATION_TYPES.map((t) => (
                <div key={t.type} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-zinc-200">{t.label}</p>
                    <p className="truncate text-[10px] text-zinc-500">{t.desc}</p>
                  </div>
                  <Toggle checked={!prefs.muted_types.includes(t.type)} onChange={() => toggleType(t.type)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
