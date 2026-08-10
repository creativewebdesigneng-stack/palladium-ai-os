import { motion } from 'framer-motion';
import IntegrationCard from './IntegrationCard';
import { SectionHead } from './shared';

export default function IntegrationSection({ icon, title, items, onOpen, grad, featured }) {
  if (!items?.length) return null;
  return (
    <section>
      <SectionHead icon={icon} title={title} count={items.length} grad={grad} />
      <div className={`grid gap-3 ${featured ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
        {items.map((it, i) => (
          <motion.div key={it.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}>
            <IntegrationCard item={it} onOpen={onOpen} featured={featured} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}