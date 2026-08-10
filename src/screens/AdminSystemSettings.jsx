import { useMemo, useState } from 'react';
import { Lock, Info, Check } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import SettingsTabs from '@/components/admin-settings/SettingsTabs';
import SettingsSection from '@/components/admin-settings/SettingsSection';
import { SECTIONS } from '@/components/admin-settings/settingsData';

const initial = () => {
  const o = {};
  SECTIONS.forEach(s => s.cards.forEach(c => { o[c.id] = c.value; }));
  return o;
};

export default function AdminSystemSettings() {
  const [active, setActive] = useState('general');
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);

  const section = useMemo(() => SECTIONS.find(s => s.key === active), [active]);

  const onSave = (id, value) => {
    setValues(v => ({ ...v, [id]: value }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="System Settings" description="Platform-wide configuration — restricted to administrators." action={
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-medium text-emerald-300"><Lock className="h-3.5 w-3.5" />Admin access verified</span>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-[11px] text-rose-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Changes affect every organisation on the platform. Sensitive changes require confirmation. Data shown is illustrative mock data — backend-ready for live settings APIs.</p></div>

      <div className="sticky top-0 z-10 mb-4"><SettingsTabs sections={SECTIONS} active={active} setActive={setActive} /></div>

      <SettingsSection section={section} values={values} onSave={onSave} />

      {saved && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/15 px-3 py-2 text-[12px] font-medium text-emerald-200 backdrop-blur">
          <Check className="h-3.5 w-3.5" />Setting updated
        </div>
      )}
    </>
  );
}