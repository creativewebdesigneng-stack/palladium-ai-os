import { Globe } from 'lucide-react';
import { Panel, Field, Select } from './shared';
import { ACCOUNT, LANGUAGES, TIMEZONES, DATE_FORMATS, CURRENCIES } from './settingsData';

export default function AccountSection({ data, update }) {
  return (
    <Panel icon={Globe} title="Account" grad="from-sky-500 to-cyan-500" desc="Localisation and regional preferences.">
      <div className="space-y-4">
        <Field label="Language"><Select value={data.language} onChange={(v) => update('language', v)} options={LANGUAGES} /></Field>
        <Field label="Timezone"><Select value={data.timezone} onChange={(v) => update('timezone', v)} options={TIMEZONES} /></Field>
        <Field label="Date Format"><Select value={data.dateFormat} onChange={(v) => update('dateFormat', v)} options={DATE_FORMATS} /></Field>
        <Field label="Currency"><Select value={data.currency} onChange={(v) => update('currency', v)} options={CURRENCIES} /></Field>
      </div>
    </Panel>
  );
}

export const initialAccount = { ...ACCOUNT };