import { Bell } from 'lucide-react';
import { Panel, ToggleRow } from './shared';

const CHANNELS = [
  { key: 'email', label: 'Email', desc: 'Receive notifications by email.' },
  { key: 'push', label: 'Push', desc: 'Mobile push notifications.' },
  { key: 'desktop', label: 'Desktop', desc: 'Browser desktop notifications.' },
];
const EVENTS = [
  { key: 'agentCompletion', label: 'Agent Completion', desc: 'When an agent finishes a task.' },
  { key: 'workflowFailure', label: 'Workflow Failure', desc: 'When a workflow run fails.' },
  { key: 'securityAlerts', label: 'Security Alerts', desc: 'Sign-ins and security events.' },
  { key: 'mentions', label: 'Mentions', desc: 'When a teammate mentions you.' },
  { key: 'billing', label: 'Billing', desc: 'Invoices, payments and renewals.' },
];

export default function NotificationsSection({ data, update }) {
  return (
    <Panel icon={Bell} title="Notifications" grad="from-amber-500 to-orange-500" desc="Choose how and when you are notified.">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Channels</p>
      <div className="mb-4 space-y-2.5">
        {CHANNELS.map((c) => (
          <ToggleRow key={c.key} label={c.label} desc={c.desc} checked={data[c.key]} onChange={(v) => update(c.key, v)} />
        ))}
      </div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Events</p>
      <div className="space-y-2.5">
        {EVENTS.map((e) => (
          <ToggleRow key={e.key} label={e.label} desc={e.desc} checked={data[e.key]} onChange={(v) => update(e.key, v)} />
        ))}
      </div>
    </Panel>
  );
}

export const initialNotifications = {
  email: true, push: true, desktop: false,
  agentCompletion: true, workflowFailure: true, securityAlerts: true, mentions: true, billing: true,
};