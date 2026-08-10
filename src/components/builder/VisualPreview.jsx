import { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';


const SIZES = {
  desktop: 'w-full',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

export default function VisualPreview() {
  const [device, setDevice] = useState('desktop');
  const [spin, setSpin] = useState(0);

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#111219] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="mx-2 flex flex-1 items-center rounded-lg border border-white/10 bg-black/30 px-2.5 py-1">
          <span className="text-[11px] text-zinc-500">https://palladium-crm.app</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
          {[['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]].map(([d, Icon]) => (
            <button key={d} onClick={() => setDevice(d)} className={`rounded-md p-1.5 ${device === d ? 'bg-white/10 text-white' : 'text-zinc-500'}`}><Icon className="h-3.5 w-3.5" /></button>
          ))}
        </div>
        <button onClick={() => setSpin(s => s + 1)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><RefreshCw className="h-3.5 w-3.5" /></button>
        <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /></button>
      </div>
      <div className="grid flex-1 place-items-center overflow-hidden p-4">
        <motion.div
          key={device + spin}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${SIZES[device]} overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#171924] to-[#0f1016]`}
          style={{ height: device === 'mobile' ? 460 : device === 'tablet' ? 520 : 480 }}
        >
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Palladium CRM</span>
              <div className="flex gap-2">{['bg-violet-500/40', 'bg-cyan-500/40', 'bg-emerald-500/40'].map(c => <span key={c} className={`h-5 w-12 rounded ${c}`} />)}</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[['$48K', 'Revenue'], ['1,204', 'Leads'], ['98%', 'Retention']].map(([v, l]) => (
                <div key={l} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <p className="text-sm font-semibold text-white">{v}</p>
                  <p className="text-[10px] text-zinc-500">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex-1 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex h-full items-end gap-1.5">
                {[40, 65, 50, 80, 60, 90, 75, 95, 70, 85, 55, 78].map((v, i) => (
                  <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${v}%` }} transition={{ delay: i * 0.05 }} className="flex-1 rounded-t bg-gradient-to-t from-violet-600 to-cyan-400" />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}