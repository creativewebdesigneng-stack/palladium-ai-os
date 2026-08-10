import { motion } from 'framer-motion';

const models = [
  ['Claude', 'from-orange-400 to-amber-500', 'C'],
  ['GPT-5', 'from-emerald-400 to-teal-500', 'G'],
  ['Gemini', 'from-blue-400 to-indigo-500', 'G'],
  ['Llama', 'from-purple-400 to-fuchsia-500', 'L'],
  ['Mistral', 'from-rose-400 to-orange-500', 'M'],
  ['DeepSeek', 'from-cyan-400 to-blue-500', 'D'],
  ['Grok', 'from-zinc-300 to-zinc-500', 'X'],
  ['Command R', 'from-violet-400 to-indigo-500', 'R'],
];

export default function ModelLogos() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-zinc-600">Every model, one workspace</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-10">
        {models.map(([name, grad, ch], i) => (
          <motion.div key={name}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2.5">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${grad} text-sm font-semibold text-white shadow-lg`}>{ch}</span>
            <span className="text-sm font-medium text-zinc-400">{name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}