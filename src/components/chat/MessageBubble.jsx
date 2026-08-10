import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, RotateCcw, Pencil, Trash2, ThumbsUp, ThumbsDown, Sparkles, Check, RefreshCw } from 'lucide-react';

function CodeBlock({ children, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(String(children)); setCopied(true); setTimeout(() => setCopied(false), 1200); };

  if (lang === 'table') {
    const rows = String(children).trim().split('\n').map(r => r.split('|'));
    if (!rows.length) return null;
    return (
      <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/5 text-zinc-300">
            <tr>{rows[0].map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium">{h.trim()}</th>)}</tr>
          </thead>
          <tbody className="text-zinc-400">
            {rows.slice(1).map((r, i) => (
              <tr key={i} className="border-t border-white/5">{r.map((c, j) => <td key={j} className="px-3 py-2">{c.trim()}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="group my-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-zinc-600">{lang || 'Code'}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-5 text-zinc-300"><code>{children}</code></pre>
    </div>
  );
}

export default function MessageBubble({ message, onCopy, onRegenerate, onDelete, onEdit, onReact }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState(message.reaction || null);

  const copy = () => { navigator.clipboard?.writeText(message.text); setCopied(true); onCopy?.(message); setTimeout(() => setCopied(false), 1200); };
  const react = (r) => { setReaction(prev => prev === r ? null : r); onReact?.(message, r); };

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-semibold text-white ${isUser ? 'bg-gradient-to-br from-violet-500 to-indigo-500' : 'bg-gradient-to-br from-cyan-400 to-blue-500'}`}>
        {isUser ? 'U' : <Sparkles className="h-4 w-4" />}
      </span>

      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-7 ${isUser ? 'rounded-tr-sm bg-gradient-to-br from-violet-600 to-indigo-600 text-white' : 'rounded-tl-sm border border-white/10 bg-white/[.03] text-zinc-200'}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.text}</div>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                components={{
                  code: ({ inline, className, children }) => {
                    const lang = (className || '').replace('language-', '');
                    if (inline) return <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-violet-200">{children}</code>;
                    return <CodeBlock lang={lang}>{children}</CodeBlock>;
                  },
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-violet-300 underline underline-offset-2">{children}</a>,
                  img: ({ src, alt }) => <img src={src} alt={alt || ''} className="my-2 rounded-xl border border-white/10" />,
                  ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h3 className="mb-1 mt-3 text-base font-semibold text-white">{children}</h3>,
                  h2: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold text-white">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                }}
              >{message.text || ' '}</ReactMarkdown>
              {message.streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-violet-400 align-middle" />}
            </div>
          )}
        </div>

        {!isUser && !message.streaming && (
          <div className="mt-1.5 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button onClick={copy} className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Copy">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
            <button onClick={() => onRegenerate?.(message)} className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Regenerate"><RefreshCw className="h-3.5 w-3.5" /></button>
            <button onClick={() => onEdit?.(message)} className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => onDelete?.(message)} className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-rose-400" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
            <span className="mx-1 h-3 w-px bg-white/10" />
            <button onClick={() => react('up')} className={`rounded-md p-1 hover:bg-white/5 ${reaction === 'up' ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`} aria-label="Thumbs up"><ThumbsUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => react('down')} className={`rounded-md p-1 hover:bg-white/5 ${reaction === 'down' ? 'text-rose-400' : 'text-zinc-500 hover:text-white'}`} aria-label="Thumbs down"><ThumbsDown className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}