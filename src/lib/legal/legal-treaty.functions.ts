import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchPublicWeb, type WebSource } from "@/lib/ai/web-access.server";
import { runChat } from "@/lib/runtime/model-gateway.server";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import {
  annotateTreatySources,
  dedupeTreatySources,
  getTreatySourceProfile,
  type TreatySourceProfile,
} from "./treaty-sources";

type Sb = { from: (table: string) => any };

const input = z.object({
  query: z.string().trim().min(3).max(600),
  jurisdiction: z.string().trim().min(2).max(140),
  party: z.string().trim().max(140).optional(),
  statusFocus: z
    .enum(["all", "text", "party-status", "entry-into-force", "reservations", "termination", "domestic-effect"])
    .default("all"),
});

export const TREATY_SYSTEM_INSTRUCTIONS = `You are Blackstar Treaty Intelligence. Provide legal information, not legal advice. Use only the supplied live evidence and never invent a treaty title, party, date, treaty action, reservation, declaration, objection, territorial extension, entry-into-force date, withdrawal, denunciation, amendment, protocol, quotation or URL. Treat instrument text, depositary/status records and domestic implementation as different evidence questions. Signature alone does not establish ratification, entry into force, or that a state is currently bound. A treaty's general entry into force does not by itself prove entry into force for a particular party. A party/status record does not by itself prove domestic enforceability, direct effect, incorporation or implementing legislation. Distinguish binding treaties from non-binding arrangements where the source does so. Do not infer current status from an old treaty text or search snippet. Identify reservations, declarations, objections, territorial application, amendments, protocols, denunciation or withdrawal only when supplied evidence supports them. If current party status or legal effect cannot be established, say so explicitly. Cite factual propositions with Markdown links only to supplied URLs. End with sections titled 'Status verification' and 'Domestic effect and professional review'.`;

export function buildTreatyQueries(
  profile: TreatySourceProfile,
  query: string,
  party?: string,
  statusFocus = "all",
): string[] {
  const focus = statusFocus === "all" ? "status entry into force reservations treaty text" : statusFocus.replaceAll("-", " ");
  const target = [query, party, profile.jurisdiction, "treaty agreement", focus].filter(Boolean).join(" ");
  return profile.officialHosts.slice(0, 4).map((host) => `${target} site:${host}`);
}

async function searchOfficialTreatyEvidence(
  profile: TreatySourceProfile,
  query: string,
  party?: string,
  statusFocus = "all",
): Promise<WebSource[]> {
  const attempts = await Promise.allSettled(
    buildTreatyQueries(profile, query, party, statusFocus).map((searchQuery) => searchPublicWeb(searchQuery, 6)),
  );
  const targeted = attempts.flatMap((attempt) =>
    attempt.status === "fulfilled" ? attempt.value.results : [],
  );
  const deduped = dedupeTreatySources(targeted);
  if (deduped.length) return deduped;

  const fallback = await searchPublicWeb(
    [query, party, profile.jurisdiction, "treaty agreement official status entry into force"].filter(Boolean).join(" "),
    12,
  );
  return dedupeTreatySources(fallback.results);
}

export const runTreatyIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data, context }) => {
    const profile = getTreatySourceProfile(data.jurisdiction);
    if (!profile) throw new Error("Treaty intelligence is not yet configured for that jurisdiction/source system.");

    const sb = context.supabase as unknown as Sb;
    let pref = null;
    try {
      const result = await sb
        .from("user_ai_preferences")
        .select("default_provider,default_model")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!result.error) pref = result.data;
    } catch {
      // Fall back to Blackstar's governed assistant routing.
    }
    const { provider, model } = resolveAssistantModelPreference(pref);

    const rawSources = await searchOfficialTreatyEvidence(
      profile,
      data.query,
      data.party,
      data.statusFocus,
    );
    const sources = annotateTreatySources(rawSources, profile).slice(0, 14);
    if (!sources.length) throw new Error("No live treaty sources were found for this search.");

    const officialCount = sources.filter((source) => source.official).length;
    const evidence = sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.title}\nURL: ${source.url}\nSource status: ${
            source.official ? "configured official treaty/depositary host" : "discovery-only public source"
          }\nSnippet: ${source.snippet ?? ""}`,
      )
      .join("\n\n");

    const prompt = `Research issue: ${data.query}\nSource system / jurisdiction: ${profile.jurisdiction}\nConfigured scope: ${profile.scope}\nParty or state supplied by user: ${data.party || "none"}\nStatus focus: ${data.statusFocus}\nRequired status checks: ${profile.statusChecks.join("; ")}\nDomestic-effect boundary: ${profile.domesticEffectNote}\nCoverage warning: ${profile.coverageNote}\nOfficial-source matches in retrieved evidence: ${officialCount}/${sources.length}\n\nLIVE EVIDENCE:\n${evidence}`;

    const result = await runChat({
      provider,
      model,
      maxTokens: 2600,
      messages: [
        { role: "system", content: TREATY_SYSTEM_INSTRUCTIONS },
        { role: "user", content: prompt },
      ],
    });

    return {
      report: result.text,
      provider: result.provider,
      model: result.model,
      sources,
      official_source_count: officialCount,
      source_count: sources.length,
      profile: {
        jurisdiction: profile.jurisdiction,
        scope: profile.scope,
        status_checks: profile.statusChecks,
        domestic_effect_note: profile.domesticEffectNote,
        coverage_note: profile.coverageNote,
        gateways: profile.gateways,
      },
    };
  });
