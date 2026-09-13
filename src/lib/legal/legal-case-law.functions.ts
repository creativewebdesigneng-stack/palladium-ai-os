import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchPublicWeb, type WebSource } from "@/lib/ai/web-access.server";
import { runChat } from "@/lib/runtime/model-gateway.server";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import {
  annotateCaseLawSources,
  dedupeCaseLawSources,
  getCaseLawProfile,
  type CaseLawSourceProfile,
} from "./case-law-sources";

type Sb = { from: (table: string) => any };

const input = z.object({
  query: z.string().trim().min(3).max(600),
  jurisdiction: z.string().trim().min(2).max(120),
  citation: z.string().trim().max(160).optional(),
  court: z.string().trim().max(180).optional(),
});

export const CASE_LAW_SYSTEM_INSTRUCTIONS = `You are Blackstar Case-Law Intelligence. Provide legal information, not legal advice. Use only the supplied live evidence. Never invent a case name, neutral citation, reporter citation, court, judge, quotation, procedural history, holding, disposition, URL or later treatment. Distinguish an official court/judiciary source from discovery-only material. A search result or snippet is not by itself proof that a decision is binding, still good law, or applicable to the user's facts. Do not state that an authority is binding unless the supplied evidence establishes the deciding court and relevant jurisdiction; even then, explicitly state that later appellate history, overruling, distinguishing and negative treatment have not been comprehensively verified unless the supplied evidence establishes them. Never infer precedential value merely because a case appears on an official website. If the relevant state, province, devolved jurisdiction, court hierarchy or procedural posture is unclear, say so. Quote only text actually present in the supplied evidence. Cite legal propositions with Markdown links to the supplied URLs. End with sections titled 'Treatment and currentness checks' and 'Professional review'.`;

export function buildCaseLawQueries(
  profile: CaseLawSourceProfile,
  query: string,
  citation?: string,
  court?: string,
): string[] {
  const target = [citation ? `"${citation}"` : "", query, court, profile.jurisdiction, "judgment opinion decision case law"]
    .filter(Boolean)
    .join(" ");
  return profile.officialHosts.slice(0, 4).map((host) => `${target} site:${host}`);
}

async function searchOfficialCaseLaw(
  profile: CaseLawSourceProfile,
  query: string,
  citation?: string,
  court?: string,
): Promise<WebSource[]> {
  const attempts = await Promise.allSettled(
    buildCaseLawQueries(profile, query, citation, court).map((searchQuery) => searchPublicWeb(searchQuery, 5)),
  );
  const officialCandidates = attempts.flatMap((attempt) =>
    attempt.status === "fulfilled" ? attempt.value.results : [],
  );
  const deduped = dedupeCaseLawSources(officialCandidates);
  if (deduped.length) return deduped;

  const fallback = await searchPublicWeb(
    [citation, query, court, profile.jurisdiction, "case law judgment court official"].filter(Boolean).join(" "),
    10,
  );
  return dedupeCaseLawSources(fallback.results);
}

export const runCaseLawIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data, context }) => {
    const profile = getCaseLawProfile(data.jurisdiction);
    if (!profile) throw new Error("Case-law intelligence is not yet configured for that jurisdiction.");

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

    const rawSources = await searchOfficialCaseLaw(profile, data.query, data.citation, data.court);
    const sources = annotateCaseLawSources(rawSources, profile).slice(0, 12);
    if (!sources.length) throw new Error("No live case-law sources were found for this search.");

    const officialCount = sources.filter((source) => source.official).length;
    const evidence = sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.title}\nURL: ${source.url}\nSource status: ${
            source.official ? "official court/judiciary host" : "discovery-only public source"
          }\nSnippet: ${source.snippet ?? ""}`,
      )
      .join("\n\n");

    const prompt = `Research issue: ${data.query}\nJurisdiction: ${profile.jurisdiction}\nConfigured scope: ${profile.scope}\nCitation supplied by user: ${data.citation || "none"}\nCourt supplied by user: ${data.court || "none"}\nConfigured hierarchy: ${profile.hierarchy.join(" > ")}\nCoverage warning: ${profile.coverageNote}\nOfficial-source matches in retrieved evidence: ${officialCount}/${sources.length}\n\nLIVE EVIDENCE:\n${evidence}`;

    const result = await runChat({
      provider,
      model,
      maxTokens: 2400,
      messages: [
        { role: "system", content: CASE_LAW_SYSTEM_INSTRUCTIONS },
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
        hierarchy: profile.hierarchy,
        coverage_note: profile.coverageNote,
        gateways: profile.gateways,
      },
    };
  });
