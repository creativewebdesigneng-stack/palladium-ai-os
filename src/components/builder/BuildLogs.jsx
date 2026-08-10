import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';
import { BUILD_LOGS, LOG_STYLE } from './builderData';

export default function BuildLogs() {
  const [logs, setLogs] = useState(BUILD_LOGS.slice(0, 4));
  const scrollRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setLogs(prev => {
        const next = BUILD_LOGS[(BUILD_LOGS.indexOf(prev[prev.length - 1]) + 1) % BUILD_LOGS.length];
        return [...prev, next].slice(-12);
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0b10] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <Terminal className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">Build Logs</h2>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />live</span>
      </div>
      <div ref={scrollRef} className="h-52 space-y-0.5 overflow-y-auto font-mono text-[12px] leading-6">
        {logs.map((l, i) => (
          <div key={i} className={`flex gap-2 ${LOG_STYLE[l.type]}`}>
            <span className="select-none text-zinc-700">$</span>
            <span>{l.text}</span>
          </div>
        ))}
        <div className="flex gap-2 text-zinc-500"><span className="select-none">$</span><span className="animate-pulse">▌</span></div>
      </div>
    </div>
  );
}