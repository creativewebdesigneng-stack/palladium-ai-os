import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatTopbar from '@/components/chat/ChatTopbar';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatPromptBox from '@/components/chat/ChatPromptBox';
import ChatEmptyState from '@/components/chat/ChatEmptyState';
import { assistantChat } from '@/lib/ai/assistant.functions';
import { friendlyMessage } from '@/lib/errors';

function createConversation() {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'New chat',
    messages: [],
    provider: null,
    model: null,
  };
}

export default function Chat() {
  const initial = useMemo(() => createConversation(), []);
  const [conversations, setConversations] = useState([initial]);
  const [activeId, setActiveId] = useState(initial.id);
  const [showLeft, setShowLeft] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [retryMessage, setRetryMessage] = useState(null);
  const assistantFn = useServerFn(assistantChat);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];
  const messages = active?.messages ?? [];

  const updateConversation = (id, updater) => {
    setConversations((current) => current.map((conversation) => conversation.id === id ? updater(conversation) : conversation));
  };

  const newChat = () => {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setError(null);
    setRetryMessage(null);
  };

  const send = async (text) => {
    const message = text.trim();
    if (!message || pending || !active) return;

    const conversationId = active.id;
    const history = active.messages.slice(-8).map((item) => ({
      role: item.role === 'ai' ? 'assistant' : 'user',
      content: item.text,
    }));
    const userMessage = { id: `msg-${Date.now()}-user`, role: 'user', text: message };

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      name: conversation.messages.length === 0 && conversation.name === 'New chat' ? message.slice(0, 48) : conversation.name,
      messages: [...conversation.messages, userMessage],
    }));
    setPending(true);
    setError(null);
    setRetryMessage(null);

    try {
      const result = await assistantFn({ data: { message, history } });
      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'ai',
        text: result.text,
        sources: result.sources ?? [],
        webSearchAttempted: Boolean(result.webSearchAttempted),
      };
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, assistantMessage],
        provider: result.provider,
        model: result.model,
      }));
    } catch (requestError) {
      console.error('[Chat] live assistant request failed', requestError);
      setError(friendlyMessage(requestError));
      setRetryMessage(message);
    } finally {
      setPending(false);
    }
  };

  const retry = async () => {
    if (!retryMessage || pending || !active) return;
    const failedMessage = retryMessage;
    const conversationId = active.id;
    const currentMessages = active.messages;
    const last = currentMessages[currentMessages.length - 1];
    const historySource = last?.role === 'user' && last.text === failedMessage ? currentMessages.slice(0, -1) : currentMessages;
    const history = historySource.slice(-8).map((item) => ({ role: item.role === 'ai' ? 'assistant' : 'user', content: item.text }));

    setPending(true);
    setError(null);
    try {
      const result = await assistantFn({ data: { message: failedMessage, history } });
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, {
          id: `msg-${Date.now()}-assistant`,
          role: 'ai',
          text: result.text,
          sources: result.sources ?? [],
          webSearchAttempted: Boolean(result.webSearchAttempted),
        }],
        provider: result.provider,
        model: result.model,
      }));
      setRetryMessage(null);
    } catch (requestError) {
      console.error('[Chat] live assistant retry failed', requestError);
      setError(friendlyMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  const renameChat = (name) => {
    if (!active) return;
    updateConversation(active.id, (conversation) => ({ ...conversation, name }));
  };

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[600px] gap-3">
      <div className="hidden lg:block">
        <ChatSidebar conversations={conversations} activeId={activeId} onSelect={(id) => { setActiveId(id); setError(null); setRetryMessage(null); }} onNew={newChat} />
      </div>

      {showLeft && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLeft(false)} />
          <div className="absolute left-0 top-0 h-full">
            <ChatSidebar
              conversations={conversations}
              activeId={activeId}
              onSelect={(id) => { setActiveId(id); setShowLeft(false); setError(null); setRetryMessage(null); }}
              onNew={() => { newChat(); setShowLeft(false); }}
            />
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d13] shadow-xl">
        <ChatTopbar
          title={active?.name || 'New chat'}
          provider={active?.provider}
          model={active?.model}
          onRename={renameChat}
          onToggleLeft={() => setShowLeft(true)}
        />

        {error && (
          <div className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 text-xs text-rose-100 sm:mx-6">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Live AI request failed</p>
              <p className="mt-0.5 text-rose-100/70">{error}</p>
            </div>
            {retryMessage && <button onClick={retry} disabled={pending} className="flex items-center gap-1.5 rounded-lg border border-rose-300/20 px-2.5 py-1.5 font-medium hover:bg-white/5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />Retry</button>}
          </div>
        )}

        {messages.length === 0 ? <ChatEmptyState onPrompt={send} /> : <ChatMessages messages={messages} />}
        <ChatPromptBox onSend={send} pending={pending} />
      </section>
    </div>
  );
}
