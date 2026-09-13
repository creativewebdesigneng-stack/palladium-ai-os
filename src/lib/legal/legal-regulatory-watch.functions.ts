import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchPublicWeb, type WebSource } from "@/lib/ai/web-access.server";
import { notify } from "@/lib/notifications/notify.server";

type Sb = { from: (table: string) => any };

type EvidenceAssessment = {
  first_check: boolean;
  changed: boolean;
  review_required: boolean;
};

const schema = z.object({
  name: z.string().trim().min(1).max(180),
  jurisdiction: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(160),
  authority: z.string().trim().max(180).optional(),
  source_url: z.string().url().optional().or(z.literal("")),
});

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

export const listLegalRegulatoryWatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("legal_regulatory_watches")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveLegalRegulatoryWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => schema.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: watch, error } = await sb
      .from("legal_regulatory_watches")
      .insert({
        ...data,
        authority: data.authority || null,
        source_url: data.source_url || null,
        user_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return watch;
  });

export const checkLegalRegulatoryWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: watch, error } = await sb
      .from("legal_regulatory_watches")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !watch) throw new Error("Regulatory watch not found.");

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

    const { error: updateError } = await sb
      .from("legal_regulatory_watches")
      .update({
        last_checked_at: checkedAt,
        last_fingerprint: fingerprint,
        last_summary: summary,
        updated_at: checkedAt,
      })
      .eq("id", watch.id)
      .eq("user_id", context.userId);
    if (updateError) throw new Error(updateError.message);

    if (assessment.review_required) {
      await notify({
        userId: context.userId,
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
    }

    return {
      ...assessment,
      checked_at: checkedAt,
      summary,
      sources,
    };
  });
