import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

// Standardised reusable side drawer.
const SIDES = { right: 'right-0', left: 'left-0' };
const MOTION = {
  right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
  left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
};

export default function Drawer({ open, onClose, title, description, children, footer, side = 'right', width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          onMouseDown={onClose}
        >
          <motion.div
            {...MOTION[side]}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Drawer'}
            className={`absolute top-0 ${SIDES[side]} h-full w-full ${width} overflow-y-auto border-l border-white/10 bg-[#0c0d14] shadow-2xl`}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#0c0d14]/90 px-6 py-4 backdrop-blur">
              <div>
                {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
                {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-white/10 bg-[#0c0d14]/90 px-6 py-4 backdrop-blur">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}