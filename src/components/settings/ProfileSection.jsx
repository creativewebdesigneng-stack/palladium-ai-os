import { User, Upload, Camera } from 'lucide-react';
import { Panel, Field, TextInput, TextArea } from './shared';
import { PROFILE } from './settingsData';

export default function ProfileSection({ data, update }) {
  return (
    <Panel icon={User} title="Profile" grad="from-violet-500 to-indigo-500" desc="Your public identity across PalladiumAI.">
      <div className="mb-5 flex items-center gap-4">
        <div className="relative">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-xl font-semibold text-white">
            {data.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <button className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-white/15 bg-zinc-900 text-zinc-300 hover:bg-white/10">
            <Camera className="h-3 w-3" />
          </button>
        </div>
        <div>
          <button className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
            <Upload className="h-3.5 w-3.5" /> Upload avatar
          </button>
          <p className="mt-1.5 text-[10px] text-zinc-600">PNG or JPG, up to 2 MB.</p>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Name"><TextInput value={data.name} onChange={(v) => update('name', v)} /></Field>
        <Field label="Username"><TextInput value={data.username} onChange={(v) => update('username', v)} prefix="@" /></Field>
        <Field label="Email"><TextInput value={data.email} onChange={(v) => update('email', v)} /></Field>
        <Field label="Job Title"><TextInput value={data.jobTitle} onChange={(v) => update('jobTitle', v)} /></Field>
        <Field label="Company"><TextInput value={data.company} onChange={(v) => update('company', v)} /></Field>
        <Field label="Bio"><TextArea value={data.bio} onChange={(v) => update('bio', v)} /></Field>
      </div>
    </Panel>
  );
}

export const initialProfile = { ...PROFILE };