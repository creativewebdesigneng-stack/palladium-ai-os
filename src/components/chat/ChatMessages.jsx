import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatMessages({ messages, onRegenerate, onDelete, onEdit }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  return (
    <div ref={ref} className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} onRegenerate={onRegenerate} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}