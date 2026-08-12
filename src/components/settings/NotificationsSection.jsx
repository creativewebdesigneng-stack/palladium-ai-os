import { Bell } from 'lucide-react';
import { Panel, NotConfigured } from './shared';

export default function NotificationsSection() {
  return (
    <Panel icon={Bell} title="Notifications" grad="from-amber-500 to-orange-500" desc="Choose how and when you are notified.">
      <NotConfigured icon={Bell} title="Not configured yet"
        desc="Per-channel and per-event notification preferences aren't stored yet — you'll still receive in-app notifications. Granular controls will appear here once wired up." />
    </Panel>
  );
}
