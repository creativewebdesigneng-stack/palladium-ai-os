import { Mail, Bell, Monitor, MessageSquare, LayoutGrid, BellRing } from 'lucide-react';
import { Panel, Toggle } from './shared';
import { CHANNEL_SETTINGS } from './notificationsData';

const ICONS = { Mail, Bell, Monitor, MessageSquare, LayoutGrid };

export default function NotificationSettings({ settings, update }) {
  return (
    <Panel icon={BellRing} title="Notification Settings" grad="from-violet-500 to-indigo-500" desc="Control how and where you receive notifications.">
      <div className="space-y-2.5">
        {CHANNEL_SETTINGS.map((c) => {
          const Icon = ICONS[c.icon];
          return (
            <div key={c.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${c.grad}`}><Icon className="h-4 w-4 text-white" /></span>
                <div>
                  <p className="text-xs font-medium text-white">{c.label}</p>
                  <p className="text-[10px] text-zinc-500">{c.desc}</p>
                </div>
              </div>
              <Toggle checked={settings[c.key]} onChange={(v) => update(c.key, v)} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export const initialSettings = { email: true, push: true, desktop: false, sms: false, inapp: true };