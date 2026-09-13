import { createHash } from "node:crypto";
import { searchPublicWeb, type WebSource } from "@/lib/ai/web-access.server";
import { notifyWithOutcome } from "@/lib/notifications/notify.server";

type Sb = { from: (table: string) => any };

export type EvidenceAssessment = {
  first_check: boolean;
  changed: boolean;
  review_required: boolean;
};

export type LegalRegulatoryWatchRecord = {
  id: string;
  user_id: string;
  name: string;
  jurisdiction: string;
  topic: string;
  authority?: string | null;
  source_url?: string | null;
  status?: "active" | "paused";
  check_interval_hours?: number | null;
  last_fingerprint?: string | null;
};

export function officialSourceHost(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function isSourceOnOfficialHost(url: string, host: string): boolean {
  try {
    const candidate = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return candidate === host || candidate.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function restrictToOfficialSourceHost(
  sources: WebSource[],
  sourceUrl?: string | null,
): WebSource[] {
  const host = officialSourceHost(sourceUrl);
  return host ? sources.filter((source) => isSourceOnOfficialHost(source.url, host)) : sources;
}

export function fingerprintRegulatoryEvidence(sources: WebSource[]): string {
  const canonical = sources
    .map((source) => [source.url.trim(), source.title.trim(), (source.snippet ?? "").trim()].join("|"))
    .sort((a, b) => a.localeCompare(b))
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export function assessRegulatoryEvidenceChange(
  previousFingerprint: string | null | undefined,
  currentFingerprint: string,
): EvidenceAssessment {
  const firstCheck = !previousFingerprint;
  const changed = !firstCheck && previousFingerprint !== currentFingerprint;
  return {
    first_check: firstCheck,
    changed,
    review_required: changed,
  };
}

async function reviewSignalAlreadyRecorded(args: {
  userId: string;
  watchId: string;
  fingerprint: string;
}): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Sb;
  const { data } = await db
    .from("notifications")
    .select("id")
    .eq("user_id", args.userId)
    .eq("kind", "legal.regulatory_review_signal")
    .contains("metadata", {
      watch_id: args.watchId,
      evidence_fingerprint: args.fingerprint,
    })
    .limit(1);
  return Boolean(data?.length);
}

export async function runLegalRegulatoryEvidenceCheck(args: {
  sb: Sb;
  watch: LegalRegulatoryWatchRecord;
  userId: string;
}) {
  const { sb, watch, userId } = args;
  const host = officialSourceHost(watch.source_url);
  const query = [
    watch.topic,
    watch.jurisdiction,
    watch.authority,
    "law regulation consultation guidance official",
    host ? `site:${host}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const web = await searchPublicWeb(query, 8);
  const sources = restrictToOfficialSourceHost(web.results.slice(0, 8), watch.source_url);
  if (!sources.length) {
    throw new Error(
      host
        ? `No current public regulatory sources were found on ${host}.`
        : "No current public regulatory sources were found.",
    );
  }

  const fingerprint = fingerprintRegulatoryEvidence(sources);
  const assessment = assessRegulatoryEvidenceChange(watch.last_fingerprint, fingerprint);
  const summary = sources
    .slice(0, 3)
    .map((source) => source.title)
    .join(" · ")
    .slice(0, 1000);
  const checkedAt = new Date().toISOString();

  if (assessment.review_required) {
    const duplicate = await reviewSignalAlreadyRecorded({
      userId,
      watchId: watch.id,
      fingerprint,
    });
    if (!duplicate) {
      const outcome = await notifyWithOutcome({
        userId,
        type: "legal.regulatory_review_signal",
        title: `Regulatory review signal: ${watch.name}`,
        body: "The retrieved public evidence set changed since the previous check. Review the official sources; this is not proof that the underlying law changed and is not legal advice.",
        link: "/legal-hub",
        metadata: {
          watch_id: watch.id,
          jurisdiction: watch.jurisdiction,
          topic: watch.topic,
          evidence_fingerprint: fingerprint,
        },
      });
      if (outcome === "failed") {
        throw new Error("Regulatory review notification could not be emitted.");
      }
    }
  }

  const { error: updateError } = await sb
    .from("legal_regulatory_watches")
    .update({
      last_checked_at: checkedAt,
      last_fingerprint: fingerprint,
      last_summary: summary,
      last_error: null,
      updated_at: checkedAt,
    })
    .eq("id", watch.id)
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  return {
    ...assessment,
    checked_at: checkedAt,
    summary,
    sources,
  };
}
