import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Copy, ExternalLink, Globe2, Sparkles } from 'lucide-react';

function CodeBlock({ children, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (lang === 'table') {
    const rows = String(children).trim().split('\n').map((row) => row.split('|'));
    if (!rows.length) return null;
    return (
      <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/5 text-zinc-300"><tr>{rows[0].map((heading, index) => <th key={index} className="px-3 py-2 text-left font-medium">{heading.trim()}</th>)}</tr></thead>
          <tbody className="text-zinc-400">{rows.slice(1).map((row, index) => <tr key={index} className="border-t border-white/5">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{cell.trim()}</td>)}</tr>)}</tbody>
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

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const sources = Array.isArray(message.sources) ? message.sources.filter((source) => source?.url) : [];
  const copy = () => {
    navigator.clipboard?.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

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
                  ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h3 className="mb-1 mt-3 text-base font-semibold text-white">{children}</h3>,
                  h2: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold text-white">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                }}
              >{message.text || ' '}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && sources.length > 0 && (
          <div className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.02] p-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              <Globe2 className="h-3.5 w-3.5" /> Live web sources
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.slice(0, 6).map((source, index) => (
                <a
                  key={`${source.url}-${index}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex max-w-full items-center gap-1 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1 text-[10px] text-zinc-400 transition hover:border-violet-400/30 hover:text-violet-200"
                  title={source.url}
                >
                  <span className="max-w-[220px] truncate">{source.title || new URL(source.url).hostname}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!isUser && (
          <button onClick={copy} className="mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-zinc-600 opacity-0 transition hover:bg-white/5 hover:text-white group-hover:opacity-100" aria-label="Copy response">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}{copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
