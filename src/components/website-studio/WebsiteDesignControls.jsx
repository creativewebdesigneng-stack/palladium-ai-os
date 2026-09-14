import {Palette} from 'lucide-react';
import {upsertDesignTokenCss} from '@/lib/website-studio/website-design';

export default function WebsiteDesignControls({tokens,setTokens,css,setCss}){
  const value=tokens||{};
  const update=(key,next)=>{
    const merged={...value,[key]:next};
    setTokens(merged);
    setCss(upsertDesignTokenCss(css||'',merged));
  };
  return <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
    <div className="flex items-center gap-2 text-pink-300"><Palette className="h-4 w-4"/><span className="text-[10px] font-semibold uppercase tracking-[.16em]">Visual design system</span></div>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Edit the project-level design tokens without hand-writing CSS. Website Studio writes deterministic CSS variables into the stylesheet so code and visual controls remain aligned.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Accent"><input type="color" value={value.accent||'#8b5cf6'} onChange={e=>update('accent',e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/30 p-1"/></Field>
      <Field label="Background"><input type="color" value={value.background||'#07080d'} onChange={e=>update('background',e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/30 p-1"/></Field>
      <Field label="Foreground"><input type="color" value={value.foreground||'#f7f7fb'} onChange={e=>update('foreground',e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/30 p-1"/></Field>
      <Field label="Corner radius"><select value={value.radius||'18px'} onChange={e=>update('radius',e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"><option value="0px">Square</option><option value="10px">Compact</option><option value="18px">Soft</option><option value="28px">Rounded</option></select></Field>
      <Field label="Typography"><select value={value.typography||'modern sans'} onChange={e=>update('typography',e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"><option>modern sans</option><option>editorial serif</option><option>technical mono</option><option>humanist sans</option></select></Field>
      <Field label="Spacing"><select value={value.spacing||'comfortable'} onChange={e=>update('spacing',e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"><option>compact</option><option>comfortable</option><option>spacious</option></select></Field>
      <Field label="Theme"><select value={value.theme||'dark'} onChange={e=>update('theme',e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"><option>dark</option><option>light</option><option>system</option></select></Field>
    </div>
  </section>
}
function Field({label,children}){return <label className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-[9px] uppercase tracking-[.1em] text-zinc-600">{label}</span>{children}</label>}
