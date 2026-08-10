import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Fast, professional page-transition wrapper. Mount-only fade + slight rise,
// keyed by pathname so each navigation re-triggers the entrance. No exit
// animation (keeps navigation instant) and no long loading states.
export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}