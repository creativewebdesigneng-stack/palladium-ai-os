import type { WebSource } from "@/lib/ai/web-access.server";

export type TreatySourceProfile = {
  id: string;
  jurisdiction: string;
  scope: string;
  officialHosts: string[];
  gateways: Array<{ name: string; url: string; scope: string }>;
  statusChecks: string[];
  domesticEffectNote: string;
  coverageNote: string;
};

export const TREATY_SOURCE_PROFILES: TreatySourceProfile[] = [
  {
    id: "un",
    jurisdiction: "International / United Nations",
    scope: "Multilateral treaties deposited with the UN Secretary-General and treaties registered with the UN Secretariat",
    officialHosts: ["treaties.un.org"],
    gateways: [
      { name: "United Nations Treaty Collection", url: "https://treaties.un.org/", scope: "Treaty texts, depositary status, treaty actions, reservations, declarations and objections" },
    ],
    statusChecks: ["instrument text", "depositary", "entry into force", "party action", "reservations / declarations / objections", "withdrawal / denunciation", "amendments / protocols"],
    domesticEffectNote: "International treaty status does not by itself establish domestic enforceability, direct effect or implementing legislation in any state.",
    coverageNote: "The UN Treaty Collection is authoritative for treaties and treaty actions within its depositary/registration scope, not every treaty concluded worldwide.",
  },
  {
    id: "uk",
    jurisdiction: "United Kingdom",
    scope: "Treaties to which the United Kingdom is or has been a party",
    officialHosts: ["treaties.fcdo.gov.uk", "gov.uk"],
    gateways: [
      { name: "UK Treaties Online", url: "https://treaties.fcdo.gov.uk/", scope: "FCDO Treaty Unit record of UK treaty obligations and treaty-series texts" },
      { name: "UK Treaties guidance", url: "https://www.gov.uk/guidance/uk-treaties", scope: "Government treaty publication and process guidance" },
    ],
    statusChecks: ["signature", "ratification / accession", "entry into force for the UK", "territorial application", "reservations / declarations", "termination / withdrawal", "Command Paper / treaty-series text"],
    domesticEffectNote: "A treaty binding the United Kingdom internationally does not automatically establish that a provision has domestic legal effect; implementing legislation and constitutional context must be checked.",
    coverageNote: "Database records and treaty texts should be checked together, especially for amendments, territorial extensions, reservations and termination.",
  },
  {
    id: "eu",
    jurisdiction: "European Union",
    scope: "EU founding treaties and international agreements recorded in EUR-Lex",
    officialHosts: ["eur-lex.europa.eu"],
    gateways: [
      { name: "EUR-Lex Treaties", url: "https://eur-lex.europa.eu/eli/treaty/", scope: "EU treaty texts, metadata and legal-status information" },
    ],
    statusChecks: ["instrument type", "legal status", "date of signature / conclusion", "entry into force", "parties", "amendments / consolidated text", "related EU acts"],
    domesticEffectNote: "Whether an EU international agreement or treaty provision has direct effect, and how it interacts with national law, is a separate legal question requiring authority-specific analysis.",
    coverageNote: "Distinguish founding treaties, accession/amending treaties and EU international agreements; consolidated texts are useful but the operative legal history may require underlying instruments.",
  },
  {
    id: "ca",
    jurisdiction: "Canada",
    scope: "Treaties and international agreements recorded by the Government of Canada",
    officialHosts: ["treaty-accord.gc.ca"],
    gateways: [
      { name: "Canada Treaty Information", url: "https://www.treaty-accord.gc.ca/", scope: "Government of Canada treaty information" },
    ],
    statusChecks: ["Canada party status", "signature", "ratification / accession", "entry into force", "reservations / declarations", "termination", "federal / provincial implementation context"],
    domesticEffectNote: "International obligations and domestic implementation are distinct. Federal/provincial competence and implementing legislation must be checked before drawing domestic-law conclusions.",
    coverageNote: "Use the Canadian record as the starting point, and verify multilateral depositary records where party actions or reservations are material.",
  },
  {
    id: "au",
    jurisdiction: "Australia",
    scope: "Treaties to which Australia is a signatory or has taken treaty action",
    officialHosts: ["dfat.gov.au", "info.dfat.gov.au"],
    gateways: [
      { name: "Australian Treaties Database", url: "https://www.dfat.gov.au/international-relations/treaties/australian-treaties-database", scope: "Treaty texts and, where applicable, National Interest Analyses" },
    ],
    statusChecks: ["signature / treaty action", "entry into force for Australia", "treaty text", "National Interest Analysis", "reservations / declarations", "termination / supersession", "implementing legislation"],
    domesticEffectNote: "Treaty obligations and enforceable Australian domestic law are separate questions; implementing Commonwealth or state/territory law must be identified.",
    coverageNote: "The Australian Treaties Database is a research starting point; verify the operative status and primary treaty/depositary records for consequential conclusions.",
  },
  {
    id: "nz",
    jurisdiction: "New Zealand",
    scope: "New Zealand treaty obligations and international arrangements recorded by MFAT",
    officialHosts: ["treaties.mfat.govt.nz", "mfat.govt.nz"],
    gateways: [
      { name: "New Zealand Treaties Online", url: "https://www.treaties.mfat.govt.nz/", scope: "Official record of New Zealand binding treaty obligations and separate non-binding arrangements" },
    ],
    statusChecks: ["treaty versus non-binding arrangement", "NZ adherence status", "treaty status", "entry into force", "reservations / declarations", "termination", "implementing legislation"],
    domesticEffectNote: "A binding international obligation does not, by itself, prove that its provisions are directly enforceable in New Zealand domestic law.",
    coverageNote: "Keep legally binding treaties separate from political or administrative arrangements that are expressly recorded as non-binding.",
  },
];

export function getTreatySourceProfile(jurisdiction: string): TreatySourceProfile | null {
  return TREATY_SOURCE_PROFILES.find((profile) => profile.jurisdiction === jurisdiction) ?? null;
}

export function normalizeTreatyHost(value: string): string | null {
  try {
    const url = value.includes("://") ? value : `https://${value}`;
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function hostMatchesTreatySource(url: string, allowedHosts: string[]): boolean {
  const candidate = normalizeTreatyHost(url);
  if (!candidate) return false;
  return allowedHosts.some((allowed) => {
    const host = normalizeTreatyHost(allowed);
    return Boolean(host && (candidate === host || candidate.endsWith(`.${host}`)));
  });
}

export function annotateTreatySources(
  sources: WebSource[],
  profile: TreatySourceProfile,
): Array<WebSource & { official: boolean }> {
  return sources
    .map((source) => ({ ...source, official: hostMatchesTreatySource(source.url, profile.officialHosts) }))
    .sort((a, b) => Number(b.official) - Number(a.official));
}

export function dedupeTreatySources(sources: WebSource[]): WebSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = source.url.trim().replace(/\/$/, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
