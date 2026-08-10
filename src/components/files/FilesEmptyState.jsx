import { motion } from 'framer-motion';
import { FileStack, Brain, Upload, Sparkles } from 'lucide-react';

export default function FilesEmptyState({ onStart }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-10 h-52 w-72">
        {/* Floating documents */}
        {[0, 1, 2, 3, 4].map(i => {
          const positions = [
            { x: 10, y: 30, delay: 0, grad: 'from-violet-500 to-indigo-500', icon: FileStack },
            { x: 65, y: 20, delay: 0.3, grad: 'from-sky-500 to-blue-500', icon: Brain },
            { x: 25, y: 65, delay: 0.6, grad: 'from-emerald-500 to-teal-500', icon: Sparkles },
            { x: 75, y: 60, delay: 0.9, grad: 'from-fuchsia-500 to-pink-500', icon: FileStack },
            { x: 45, y: 40, delay: 0.15, grad: 'from-amber-500 to-orange-500', icon: Brain },
          ];
          const p = positions[i];
          return (
            <motion.div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <motion.div animate={{ y: [0, -8, 0], rotate: [0, i % 2 ? 3 : -3, 0] }} transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: p.delay }}
                className={`grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-gradient-to-br ${p.grad} shadow-2xl`}>
                <p.icon className="h-6 w-6 text-white" />
              </motion.div>
            </motion.div>
          );
        })}
        {/* Central brain */}
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 shadow-2xl shadow-violet-900/50">
          <Brain className="h-10 w-10 text-white" />
        </motion.div>
        {/* Connection lines */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {[[10, 30], [65, 20], [25, 65], [75, 60]].map((pos, i) => (
            <line key={i} x1="50" y1="50" x2={pos[0]} y2={pos[1]} stroke="rgba(139,92,246,.2)" strokeWidth="0.5" strokeDasharray="2 2" />
          ))}
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-white">Build Your AI Knowledge Base</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500">Upload documents and let your AI workforce understand, search and use your knowledge automatically.</p>
      <button onClick={onStart} className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30">
        <Upload className="h-4 w-4" /> Upload Files
      </button>
    </motion.div>
  );
}