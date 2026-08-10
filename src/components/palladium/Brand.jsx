import { Sparkles } from 'lucide-react';

export default function Brand({ compact = false }) {
  return <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_24px_rgba(139,92,246,.35)]"><Sparkles className="h-4 w-4 text-white" /></span>{!compact && <span className="font-semibold tracking-tight text-white">Palladium<span className="text-violet-400">AI</span></span>}</div>;
}