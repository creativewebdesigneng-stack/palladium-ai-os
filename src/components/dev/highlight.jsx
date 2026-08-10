// Lightweight mock syntax highlighter. Returns HTML (escaped) with token spans.
const KW = {
  react: 'const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|new|await|async|try|catch|true|false|null|undefined|this',
  ts: 'const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|new|await|async|try|catch|interface|type|enum|public|private|readonly|true|false|null|undefined|this',
  js: 'const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|new|await|async|try|catch|true|false|null|undefined|this',
  py: 'def|return|if|elif|else|for|while|import|from|class|try|except|with|as|lambda|True|False|None|self|async|await|yield|raise',
  json: 'true|false|null',
};

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export function highlight(code, lang) {
  if (lang === 'markdown') return md(code);
  const e = esc(code);
  const kw = KW[lang] || '';
  const re = new RegExp(
    `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*)` + // comments
    `|(\`(?:\\\\.|[^\`])*\`|"(?:\\\\.|[^"])*"|'(?:\\\\.|[^'])*')` + // strings
    (kw ? `|\\b(${kw})\\b` : `|(\\b__nope__\\b)`) +
    `|(\\b\\d+\\.?\\d*\\b)` + // numbers
    `|(&lt;\\/?[A-Za-z][\\w.]*)`, // tags (escaped)
    'g'
  );
  return e.replace(re, (m, c, s, k, n, t) => {
    if (c) return `<span class="text-zinc-500 italic">${c}</span>`;
    if (s) return `<span class="text-emerald-400">${s}</span>`;
    if (k) return `<span class="text-violet-400">${k}</span>`;
    if (n) return `<span class="text-amber-400">${n}</span>`;
    if (t) return `<span class="text-sky-400">${t}</span>`;
    return m;
  });
}

function md(code) {
  return esc(code)
    .replace(/^(#{1,6}.*)$/gm, '<span class="text-violet-400 font-semibold">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<span class="text-white font-semibold">**$1**</span>')
    .replace(/`([^`]+)`/g, '<span class="text-emerald-400 bg-white/5 rounded px-1">`$1`</span>')
    .replace(/^(&gt;.*)$/gm, '<span class="text-zinc-500 italic">$1</span>');
}