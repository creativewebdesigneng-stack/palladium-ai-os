import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { Bot, FolderKanban, Workflow, ShieldCheck, Users, CreditCard, Server } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { EmptyState } from './shared';

const ICONS = { Bot, FolderKanban, Workflow, ShieldCheck, Users, CreditCard, Server };

export default function NotificationsList({ items, onToggleRead, onDelete }) {
  if (!items.length) {
    return <EmptyState title="You’re all caught up" desc="No notifications match your current filters. New activity will appear here." />;
  }
  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false}>
        {items.map((n) => (
          <NotificationItem key={n.id} n={n} onToggleRead={onToggleRead} onDelete={onDelete} />
        ))}
      </AnimatePresence>
    </div>
  );
}