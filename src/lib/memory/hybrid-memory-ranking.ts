// Atomic-derived pattern: fuse semantic recall with bounded lexical evidence.
export type HybridMemoryHit = {
  id: string;
  content: string;
  title?: string | null;
  similarity: number;
  kind: "memory" | "document";
  document_id?: string | null;
  [key: string]: unknown;
};

type RankedHit<T extends HybridMemoryHit> = {
  hit: T;
  score: number;
  semanticRank: number;
  keywordRank: number;
};

const EXACT_PHRASE_BOOST = 0.14;
const TITLE_EXACT_BOOST = 0.06;
const TOKEN_COVERAGE_BOOST = 0.08;
const FUSION_BONUS = 0.05;
const KEYWORD_ONLY_BASE = 0.18;

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._:/-]+/gu, " ")
    .trim();
}

function queryTokens(query: string): string[] {
  return [...new Set(normalise(query).split(/\s+/).filter((token) => token.length >= 2))].slice(0, 16);
}

function lexicalBoost(query: string, hit: HybridMemoryHit): number {
  const phrase = normalise(query);
  if (!phrase) return 0;

  const title = normalise(hit.title ?? "");
  const content = normalise(hit.content ?? "");
  const haystack = `${title} ${content}`.trim();
  let boost = 0;

  if (haystack.includes(phrase)) boost += EXACT_PHRASE_BOOST;
  if (title && (title === phrase || title.includes(phrase))) boost += TITLE_EXACT_BOOST;

  const tokens = queryTokens(query);
  if (tokens.length) {
    const matched = tokens.filter((token) => haystack.includes(token)).length;
    boost += TOKEN_COVERAGE_BOOST * (matched / tokens.length);
  }

  return Math.min(boost, EXACT_PHRASE_BOOST + TITLE_EXACT_BOOST + TOKEN_COVERAGE_BOOST);
}

function keyFor(hit: HybridMemoryHit): string {
  return `${hit.kind}:${hit.id}`;
}

/**
 * Fuse semantic/vector retrieval with lexical retrieval without changing the
 * public meaning of `similarity`. The returned hit keeps its original semantic
 * similarity; lexical and fusion bonuses are used only for ordering.
 */
export function rankHybridMemoryHits<T extends HybridMemoryHit>(args: {
  semantic: T[];
  keyword: T[];
  query: string;
  limit: number;
}): T[] {
  const merged = new Map<string, RankedHit<T>>();

  args.semantic.forEach((hit, index) => {
    merged.set(keyFor(hit), {
      hit,
      score: Math.max(0, Number(hit.similarity) || 0) + lexicalBoost(args.query, hit),
      semanticRank: index,
      keywordRank: Number.POSITIVE_INFINITY,
    });
  });

  args.keyword.forEach((hit, index) => {
    const key = keyFor(hit);
    const existing = merged.get(key);
    if (existing) {
      // Only memory rows can legitimately arrive from both paths today. Keep
      // the semantic hit/value authoritative and use a modest ranking bonus.
      existing.keywordRank = index;
      existing.score += FUSION_BONUS;
      return;
    }

    merged.set(key, {
      hit,
      score: KEYWORD_ONLY_BASE + lexicalBoost(args.query, hit),
      semanticRank: Number.POSITIVE_INFINITY,
      keywordRank: index,
    });
  });

  return [...merged.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.semanticRank !== b.semanticRank) return a.semanticRank - b.semanticRank;
      if (a.keywordRank !== b.keywordRank) return a.keywordRank - b.keywordRank;
      return keyFor(a.hit).localeCompare(keyFor(b.hit));
    })
    .slice(0, Math.max(0, args.limit))
    .map(({ hit }) => hit);
}
