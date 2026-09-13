export type LegalHandoffMatter = {
  id?: string;
  title?: string | null;
  jurisdiction?: string | null;
  topic?: string | null;
  question?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LegalHandoffRun = {
  id?: string;
  created_at?: string | null;
  query?: string | null;
  jurisdiction?: string | null;
  topic?: string | null;
  report?: string | null;
  provider?: string | null;
  model?: string | null;
  sources?: Array<{ title?: string | null; url?: string | null; snippet?: string | null }> | null;
};

export const LEGAL_HANDOFF_NOTICE =
  "This packet is a research hand-off, not legal advice or a determination that any authority applies, remains current, is binding, or is enforceable. A qualified lawyer should verify the governing jurisdiction, facts, current official texts, commencement and amendments, case-law treatment, procedural requirements, deadlines, treaty status and domestic effect before a consequential decision.";

function text(value: unknown, fallback = "Not recorded"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.trim() : parsed.toISOString();
}

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function legalHandoffFilename(title?: string | null): string {
  const slug = text(title, "legal-matter")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${slug || "legal-matter"}-professional-review.md`;
}

export function buildLegalProfessionalHandoffPacket(input: {
  matter: LegalHandoffMatter;
  runs?: LegalHandoffRun[] | null;
  generatedAt?: string | Date;
}): string {
  const { matter } = input;
  const runs = Array.isArray(input.runs) ? input.runs : [];
  const generatedAt = input.generatedAt instanceof Date
    ? input.generatedAt.toISOString()
    : formatDate(input.generatedAt ?? new Date().toISOString());

  const uniqueSources = new Map<string, { title: string; url: string }>();
  for (const run of runs) {
    for (const source of run.sources ?? []) {
      const url = safeSourceUrl(source.url);
      if (!url || uniqueSources.has(url)) continue;
      uniqueSources.set(url, { title: text(source.title, new URL(url).hostname), url });
    }
  }

  const lines: string[] = [
    "# Blackstar Legal Intelligence — Professional Review Packet",
    "",
    `Generated: ${generatedAt}`,
    "",
    "> " + LEGAL_HANDOFF_NOTICE,
    "",
    "## Matter",
    "",
    `- Title: ${text(matter.title)}`,
    `- Jurisdiction recorded by user: ${text(matter.jurisdiction)}`,
    `- Topic: ${text(matter.topic, "general")}`,
    `- Matter status: ${text(matter.status)}`,
    `- Matter last updated: ${formatDate(matter.updated_at)}`,
    "",
    "## Research question",
    "",
    text(matter.question),
    "",
    "## User working notes",
    "",
    text(matter.notes, "No working notes recorded."),
    "",
    "## Professional review checklist",
    "",
    "- Confirm the governing jurisdiction, forum and conflict-of-laws position.",
    "- Verify the material facts and identify any facts that remain disputed or unknown.",
    "- Verify current official legislation/regulations, commencement, amendments, repeals and transitional provisions.",
    "- Verify court hierarchy, precedential status, appeals, overruling, distinguishing and other later treatment before relying on case law.",
    "- Distinguish binding law from regulator guidance, consultations, bills, commentary and non-binding materials.",
    "- For treaties, separately verify signature, ratification/accession, entry into force for the relevant party, reservations/declarations, withdrawal, territorial application and domestic effect.",
    "- Independently verify procedural requirements, limitation periods, filing dates and any other consequential deadlines.",
    "- Identify where local counsel, specialist counsel, regulator confirmation or another professional opinion is required.",
    "",
    `## Saved research history (${runs.length})`,
    "",
  ];

  if (!runs.length) {
    lines.push("No evidence-backed research runs are saved to this matter yet.", "");
  } else {
    runs.forEach((run, index) => {
      lines.push(
        `### Research run ${index + 1}`,
        "",
        `- Saved: ${formatDate(run.created_at)}`,
        `- Research query: ${text(run.query)}`,
        `- Jurisdiction supplied to research: ${text(run.jurisdiction, text(matter.jurisdiction))}`,
        `- Topic: ${text(run.topic, text(matter.topic, "general"))}`,
        `- Model route recorded: ${text(run.provider, "Not recorded")} / ${text(run.model, "Not recorded")}`,
        "",
        "#### Research output",
        "",
        text(run.report, "No report text was saved."),
        "",
        "#### Sources saved with this run",
        "",
      );
      const runSources = new Map<string, { title: string; url: string }>();
      for (const source of run.sources ?? []) {
        const url = safeSourceUrl(source.url);
        if (!url || runSources.has(url)) continue;
        runSources.set(url, { title: text(source.title, new URL(url).hostname), url });
      }
      if (!runSources.size) {
        lines.push("No valid HTTP(S) source records were saved with this run.", "");
      } else {
        for (const source of runSources.values()) lines.push(`- [${source.title}](${source.url})`);
        lines.push("");
      }
    });
  }

  lines.push("## Consolidated evidence links", "");
  if (!uniqueSources.size) {
    lines.push("No valid HTTP(S) evidence links are saved to this matter.", "");
  } else {
    for (const source of uniqueSources.values()) lines.push(`- [${source.title}](${source.url})`);
    lines.push("");
  }

  lines.push(
    "## Questions for qualified professional review",
    "",
    "1. Which jurisdiction(s), forum(s) and legal instruments actually govern these facts?",
    "2. Which cited authorities are current, binding or persuasive, and has later treatment changed their weight?",
    "3. Which factual assumptions in the saved research require evidence or correction?",
    "4. Are there procedural, regulatory, filing, limitation or notice requirements that the saved research has not conclusively established?",
    "5. If an international instrument is relevant, what is its current party status and domestic legal effect?",
    "6. What advice, drafting, filing, negotiation or representation should be undertaken by a qualified professional?",
    "",
    "---",
    "Blackstar preserves research context and evidence for review; this export does not certify legal correctness or replace professional advice.",
    "",
  );

  return lines.join("\n");
}
