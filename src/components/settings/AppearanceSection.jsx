import { Palette, Monitor, Sun, Moon } from 'lucide-react';
import { Panel, Field, ToggleRow } from './shared';
import { ACCENT_COLORS } from './settingsData';

const THEMES = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
];

export default function AppearanceSection({ data, update }) {
  return (
    <Panel icon={Palette} title="Appearance" grad="from-fuchsia-500 to-pink-500" desc="Customise how PalladiumAI looks and feels.">
      <div className="space-y-4">
        <Field label="Theme" hint="System follows your OS.">
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => {
              const active = data.theme === t.id;
              return (
                <button key={t.id} onClick={() => update('theme', t.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs ${active ? 'border-violet-400/40 bg-violet-500/10 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>
                  <t.icon className="h-4 w-4" />{t.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Accent Colour">
          <div className="flex gap-2">
            {ACCENT_COLORS.map((c) => {
              const active = data.accent === c.id;
              return (
                <button key={c.id} onClick={() => update('accent', c.id)}
                  className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${c.grad} ${active ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-60 hover:opacity-100'}`}>
                  {active && <span className="h-2 w-2 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
        </Field>

        <ToggleRow label="Compact Mode" desc="Reduce spacing and density for data-rich screens." checked={data.compact} onChange={(v) => update('compact', v)} />
        <ToggleRow label="Animations" desc="Enable motion and transition effects." checked={data.animations} onChange={(v) => update('animations', v)} />
      </div>
    </Panel>
  );
}

export const initialAppearance = { theme: 'dark', accent: 'violet', compact: false, animations: true };