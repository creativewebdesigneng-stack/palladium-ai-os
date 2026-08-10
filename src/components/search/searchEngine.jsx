// Search engine + AI natural-language interpreter.
// Isolated so it can be swapped for a backend function (vector search / LLM intent).
import { SEARCH_ITEMS, CATEGORIES } from './searchData';

const STOPWORDS = new Set(['the','a','an','show','me','all','of','for','to','and','is','are','was','were','my','our','in','on','at','with','that','this','list','find','which','what','did','do','please','up','last','currently','recently','recent']);

// keyword groups for NL intent detection
const CATEGORY_KEYWORDS = {
  projects: ['project','projects'],
  agents: ['agent','agents','bot','bots'],
  tasks: ['task','tasks','todo','to-do'],
  files: ['file','files','document','documents','upload','uploaded','contract','contracts'],
  knowledge: ['knowledge','playbook','policy','policies'],
  workflows: ['workflow','workflows','automation','automations'],
  integrations: ['integration','integrations','connector','connectors'],
  users: ['user','users','people','member','members','person'],
  teams: ['team','teams','squad','squads','department','departments'],
  docs: ['doc','docs','documentation','guide','guides','reference'],
  models: ['model','models','llm','llms'],
  marketplace: ['marketplace','plugin','plugins','app','apps','extension'],
};

const STATUS_INTENT = {
  failed: { match: ['failed','error','errors','failing','broken'], statuses: ['failed','error'] },
  running: { match: ['running','active','currently','live'], statuses: ['running','active'] },
  unfinished: { match: ['unfinished','incomplete','pending','open','not done','incomplete','outstanding','not finished'], not: ['done','completed','succeeded'] },
  done: { match: ['done','completed','finished','resolved','succeeded'], statuses: ['done','completed','succeeded'] },
};

const RECENCY_INTENT = [
  { match: ['today','now'], maxDays: 0 },
  { match: ['last week','past week','this week','week'], maxDays: 7 },
  { match: ['recently','recent','lately'], maxDays: 14 },
];

function tokens(q) {
  return (q || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Parse a natural-language query into a structured intent.
export function interpretQuery(query) {
  const q = (query || '').toLowerCase();
  const intent = { categories: [], status: null, notStatuses: [], recency: null, keywords: [] };

  // categories
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => q.includes(w))) intent.categories.push(cat);
  }
  // status intent (first match wins, prioritise failed/running)
  for (const key of ['failed','running','unfinished','done']) {
    const def = STATUS_INTENT[key];
    if (def.match.some((m) => q.includes(m))) {
      if (def.statuses) intent.status = def.statuses;
      if (def.not) intent.notStatuses = def.not;
      break;
    }
  }
  // recency
  for (const r of RECENCY_INTENT) {
    if (r.match.some((m) => q.includes(m))) { intent.recency = r.maxDays; break; }
  }
  // keywords for text matching (drop stopwords + intent words)
  const kw = tokens(q).filter((t) => !STOPWORDS.has(t) && t.length > 1);
  intent.keywords = kw;
  return intent;
}

function scoreItem(item, query, { ai }) {
  if (!query.trim()) return 0;
  const q = query.toLowerCase();
  const t = (item.title || '').toLowerCase();
  const d = (item.desc || '').toLowerCase();
  const tags = (item.tags || []).map((x) => x.toLowerCase());
  let score = 0;

  if (ai) {
    const intent = interpretQuery(query);
    // category intent
    if (intent.categories.length && intent.categories.includes(item.category)) score += 28;
    // status intent
    if (intent.status && intent.status.includes(item.status)) score += 24;
    if (intent.notStatuses.length && !intent.notStatuses.includes(item.status)) score += 18;
    // recency intent
    if (intent.recency !== null && item.daysAgo <= intent.recency) score += 16;
    // keyword matching
    intent.keywords.forEach((k) => {
      if (t.includes(k)) score += 30;
      else if (d.includes(k)) score += 16;
      else if (tags.some((tg) => tg.includes(k))) score += 12;
    });
  } else {
    // plain keyword search
    tokens(query).forEach((k) => {
      if (t.includes(k)) score += 30;
      else if (d.includes(k)) score += 16;
      else if (tags.some((tg) => tg.includes(k))) score += 12;
    });
  }
  // whole-phrase boost
  if (t.includes(q)) score += 20;
  return Math.min(100, Math.round(score));
}

// Run a search; returns grouped, scored results + total count.
export function runSearch(query, { ai = true, category = 'all' } = {}) {
  const trimmed = (query || '').trim();
  if (!trimmed) return { groups: [], total: 0, intent: null };
  const intent = ai ? interpretQuery(trimmed) : null;

  const scored = SEARCH_ITEMS
    .map((item) => ({ ...item, score: scoreItem(item, trimmed, { ai }) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const filtered = category === 'all' ? scored : scored.filter((i) => i.category === category);

  const groups = CATEGORIES
    .map((c) => ({ category: c, items: filtered.filter((i) => i.category === c.id) }))
    .filter((g) => g.items.length > 0);

  return { groups, total: filtered.length, intent };
}

export function categoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}