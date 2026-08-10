import { useState, useRef } from 'react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatTopbar from '@/components/chat/ChatTopbar';
import ChatModes from '@/components/chat/ChatModes';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatPromptBox from '@/components/chat/ChatPromptBox';
import ChatContextPanel from '@/components/chat/ChatContextPanel';
import ChatEmptyState from '@/components/chat/ChatEmptyState';
import PromptLibrary from '@/components/chat/PromptLibrary';
import AITools from '@/components/chat/AITools';
import { CONVERSATIONS, SEED_MESSAGES } from '@/components/chat/chatData';

export default function Chat() {
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [activeId, setActiveId] = useState('c1');
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [mode, setMode] = useState('chat');
  const [model, setModel] = useState('gpt');
  const [streaming, setStreaming] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [promptLib, setPromptLib] = useState(false);
  const [tools, setTools] = useState(false);

  const active = conversations.find(c => c.id === activeId);

  const newChat = () => {
    const id = 'c' + Date.now();
    setConversations(c => [{ id, name: 'New chat', folder: 'Work', pinned: false, time: 'now' }, ...c]);
    setActiveId(id);
    setMessages([]);
  };

  const send = (text) => {
    const userMsg = { id: 'm' + Date.now(), role: 'user', text };
    const reply = "Here's how I'd approach that:\n\n1. **Clarify the goal** and the success metric.\n2. **Break it down** into milestones with owners.\n3. **Ship a thin slice** to get feedback fast.\n\n```js\nconst plan = {\n  goal: 'ship fast',\n  steps: ['clarify', 'break down', 'ship'],\n};\n```\n\nWant me to turn this into a project board?";
    setMessages(m => [...m, userMsg, { id: 'm' + Date.now() + 1, role: 'ai', text: '', streaming: true }]);
    setStreaming(true);
    let i = 0;
    const tick = () => {
      setMessages(m => {
        const next = [...m];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, text: reply.slice(0, i), streaming: i < reply.length };
        return next;
      });
      i += 3;
      if (i < reply.length) setTimeout(tick, 16);
      else { setStreaming(false); setMessages(m => m.map((x, idx) => idx === m.length - 1 ? { ...x, streaming: false } : x)); }
    };
    setTimeout(tick, 200);
  };

  const renameChat = (name) => setConversations(c => c.map(x => x.id === activeId ? { ...x, name } : x));
  const regenerate = (msg) => { setMessages(m => m.filter(x => x.id !== msg.id)); send(msg.text); };
  const delMsg = (msg) => setMessages(m => m.filter(x => x.id !== msg.id));
  const editMsg = (msg) => { const t = prompt('Edit message', msg.text); if (t != null) setMessages(m => m.map(x => x.id === msg.id ? { ...x, text: t } : x)); };

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[600px] gap-3">
      {/* Left sidebar — desktop */}
      <div className="hidden lg:block"><ChatSidebar activeId={activeId} onSelect={setActiveId} onNew={newChat} onOpenPrompts={() => setPromptLib(true)} /></div>
      {/* Left sidebar — mobile overlay */}
      {showLeft && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLeft(false)} />
          <div className="absolute left-0 top-0 h-full"><ChatSidebar activeId={activeId} onSelect={(id) => { setActiveId(id); setShowLeft(false); }} onNew={() => { newChat(); setShowLeft(false); }} onOpenPrompts={() => setPromptLib(true)} /></div>
        </div>
      )}

      {/* Center */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13] shadow-xl">
        <ChatTopbar title={active?.name || 'New chat'} model={model} onModel={setModel} onRename={renameChat} onToggleLeft={() => setShowLeft(true)} onToggleRight={() => setShowRight(s => !s)} />
        <ChatModes mode={mode} onChange={setMode} />
        {messages.length === 0 ? (
          <ChatEmptyState onPrompt={(t) => send(t)} />
        ) : (
          <ChatMessages
            messages={messages}
            onRegenerate={regenerate}
            onDelete={delMsg}
            onEdit={editMsg}
          />
        )}
        <ChatPromptBox onSend={send} streaming={streaming} onStop={() => setStreaming(false)} onOpenPrompts={() => setPromptLib(true)} onOpenTools={() => setTools(true)} />
      </section>

      {/* Right context panel */}
      <div className={`hidden xl:block ${showRight ? '' : 'hidden'}`}><ChatContextPanel model={model} onClose={() => setShowRight(false)} /></div>
      {showRight && (
        <div className="fixed right-0 top-0 z-40 h-full xl:hidden">
          <div className="absolute inset-0 -z-10 bg-black/50 lg:hidden" onClick={() => setShowRight(false)} />
          <ChatContextPanel model={model} onClose={() => setShowRight(false)} />
        </div>
      )}

      <PromptLibrary open={promptLib} onClose={() => setPromptLib(false)} onUse={(t) => send(t)} />
      <AITools open={tools} onClose={() => setTools(false)} />
    </div>
  );
}