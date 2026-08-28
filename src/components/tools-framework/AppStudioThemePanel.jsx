import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { updateStudioTheme } from "@/lib/app-studio/app-studio-theme.functions";

const DEFAULT_THEME = {
  background: "#f8fafc",
  foreground: "#0f172a",
  accent: "#4f46e5",
  fontFamily: "Inter",
};

export default function AppStudioThemePanel({ app, toast, onSaved }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = app?.theme || {};
    setTheme({
      background: next.background || DEFAULT_THEME.background,
      foreground: next.foreground || DEFAULT_THEME.foreground,
      accent: next.accent || DEFAULT_THEME.accent,
      fontFamily: next.fontFamily || DEFAULT_THEME.fontFamily,
    });
  }, [app?.id, app?.theme]);

  const set = (key, value) => setTheme((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!app?.id) return;
    setSaving(true);
    try {
      await updateStudioTheme({ data: { appId: app.id, ...theme } });
      await onSaved?.();
      toast?.({ title: "App Studio theme saved" });
    } catch (error) {
      toast?.({ title: "Theme update failed", description: error instanceof Error ? error.message : "Could not save the theme.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pglass rounded-2xl p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400"><Palette className="h-4 w-4" />Theme</p>
      <div className="grid grid-cols-3 gap-2">
        {[['background','Background'],['foreground','Text'],['accent','Accent']].map(([key, label]) => <label key={key} className="text-[10px] text-zinc-500"><span>{label}</span><input type="color" value={theme[key]} onChange={(event) => set(key, event.target.value)} className="mt-1 h-8 w-full cursor-pointer rounded-md border border-white/10 bg-black/20 p-1" /></label>)}
      </div>
      <select value={theme.fontFamily} onChange={(event) => set("fontFamily", event.target.value)} className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white">
        {["Inter","system-ui","Arial","Georgia","monospace"].map((font) => <option key={font} value={font}>{font}</option>)}
      </select>
      <div className="mt-3 rounded-lg border border-white/10 p-3" style={{ backgroundColor: theme.background, color: theme.foreground, fontFamily: theme.fontFamily }}>
        <p className="text-xs font-semibold">Theme preview</p>
        <button type="button" disabled className="mt-2 rounded-md px-2.5 py-1.5 text-[10px] text-white" style={{ backgroundColor: theme.accent }}>Primary action</button>
      </div>
      <button onClick={save} disabled={!app || saving} className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40">{saving ? "Saving theme…" : "Save theme"}</button>
    </div>
  );
}
