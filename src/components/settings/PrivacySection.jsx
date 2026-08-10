import { Lock } from 'lucide-react';
import { Panel, ToggleRow } from './shared';

const ROWS = [
  { key: 'dataSharing', label: 'Data Sharing', desc: 'Share usage telemetry to improve the platform.' },
  { key: 'analytics', label: 'Analytics', desc: 'Allow product analytics tracking.' },
  { key: 'aiTraining', label: 'AI Training', desc: 'Allow your data to train AI models.' },
  { key: 'activityHistory', label: 'Activity History', desc: 'Keep a history of your activity.' },
];

export default function PrivacySection({ data, update }) {
  return (
    <Panel icon={Lock} title="Privacy" grad="from-emerald-500 to-teal-500" desc="Control how your data is used.">
      <div className="space-y-2.5">
        {ROWS.map((r) => (
          <ToggleRow key={r.key} label={r.label} desc={r.desc} checked={data[r.key]} onChange={(v) => update(r.key, v)} />
        ))}
      </div>
    </Panel>
  );
}

export const initialPrivacy = { dataSharing: false, analytics: true, aiTraining: false, activityHistory: true };