import { motion } from 'framer-motion';
import { Rocket, Bot, Workflow, Database, MessageSquare, Code2 } from 'lucide-react';

const ORBIT = [
  { icon: Code2, grad: 'from-violet-500 to-indigo-500', delay: 0, angle: 0 },
  { icon: Bot, grad: 'from-emerald-500 to-teal-500', delay: 0.3, angle: 60 },
  { icon: Workflow, grad: 'from-amber-500 to-orange-500', delay: 0.6, angle: 120 },
  { icon: Database, grad: 'from-sky-500 to-blue-500', delay: 0.9, angle: 180 },
  { icon: MessageSquare, grad: 'from-fuchsia-500 to-pink-500', delay: 1.2, angle: 240 },
  { icon: Rocket, grad: 'from-rose-500 to-red-500', delay: 1.5, angle: 300 },
];

export default function ProjectsEmptyState({ onStart }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-10 h-48 w-48">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200">
          {ORBIT.map((o, i) => {
            const rad = (o.angle * Math.PI) / 180;
            const x = 100 + Math.cos(rad) * 70;
            const y = 100 + Math.sin(rad) * 70;
            return <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="rgba(139,92,246,.15)" strokeWidth="1" strokeDasharray="3 3" />;
          })}
        </svg>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-900/40"
        >
          <Rocket className="h-7 w-7 text-white" />
        </motion.div>
        {ORBIT.map((o, i) => {
          const rad = (o.angle * Math.PI) / 180;
          const x = 50 + Math.cos(rad) * 35;
          const y = 50 + Math.sin(rad) * 35;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: o.delay }}
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: o.delay }}
                className={`grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-gradient-to-br ${o.grad} shadow-lg`}
              >
                <o.icon className="h-4 w-4 text-white" />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
      <h2 className="text-2xl font-semibold text-white">Start Building Something Amazing</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500">Create your first project and let your AI workforce bring it to life.</p>
      <button onClick={onStart} className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30">
        <Rocket className="h-4 w-4" /> Create Project
      </button>
    </motion.div>
  );
}