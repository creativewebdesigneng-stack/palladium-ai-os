import { RotateCw, ExternalLink, Lock } from 'lucide-react';

export default function Preview() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13]">
      <div className="flex items-center gap-1 border-b border-white/10 bg-black/30 px-2 py-1.5">
        <span className="px-1 text-[10px] text-zinc-500">Preview</span>
        <div className="relative mx-1 flex-1">
          <Lock className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-emerald-400" />
          <input value="http://localhost:5173" readOnly className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-[11px] text-zinc-300 outline-none" />
        </div>
        <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"><RotateCw className="h-3.5 w-3.5" /></button>
        <button className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"><ExternalLink className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex flex-1 items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl">
          <div className="border-b border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold text-zinc-800">Palladium</div>
          <div className="bg-zinc-50 p-4 text-center">
            <p className="text-[11px] font-bold text-zinc-900">Welcome</p>
            <p className="mt-1 text-[8px] text-zinc-500">Sign in to your workspace</p>
            <div className="mx-auto mt-3 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 py-1.5 text-[9px] font-medium text-white">Enter</div>
            <div className="mt-3 flex justify-center gap-1">
              <span className="h-1 w-1 rounded-full bg-violet-500" />
              <span className="h-1 w-1 rounded-full bg-zinc-300" />
              <span className="h-1 w-1 rounded-full bg-zinc-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}