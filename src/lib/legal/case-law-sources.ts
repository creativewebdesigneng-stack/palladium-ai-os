import type { WebSource } from "@/lib/ai/web-access.server";

export type CaseLawSourceProfile = {
  id: string;
  jurisdiction: string;
  scope: string;
  hierarchy: string[];
  officialHosts: string[];
  gateways: Array<{ name: string; url: string; scope: string }>;
  coverageNote: string;
};

export const CASE_LAW_SOURCES: CaseLawSourceProfile[] = [
  {
    id: "uk",
    jurisdiction: "United Kingdom",
    scope: "England and Wales plus UK-wide Supreme Court and Privy Council authorities",
    hierarchy: ["UK Supreme Court / Privy Council", "Court of Appeal", "High Court", "Upper and specialist tribunals", "Selected lower courts and tribunals"],
    officialHosts: ["caselaw.nationalarchives.gov.uk"],
    gateways: [
      { name: "Find Case Law — The National Archives", url: "https://caselaw.nationalarchives.gov.uk/", scope: "Official judgments and tribunal decisions" },
    ],
    coverageNote: "Coverage differs by court and period. Scotland and Northern Ireland require separate jurisdiction checks beyond UK-wide Supreme Court material.",
  },
  {
    id: "eu",
    jurisdiction: "European Union",
    scope: "Court of Justice of the European Union",
    hierarchy: ["Court of Justice", "General Court"],
    officialHosts: ["curia.europa.eu"],
    gateways: [
      { name: "CURIA", url: "https://curia.europa.eu/", scope: "CJEU case law and court materials" },
    ],
    coverageNote: "Confirm the court, procedure, language version, operative part and whether later case law has clarified or limited the decision.",
  },
  {
    id: "us",
    jurisdiction: "United States",
    scope: "United States federal courts",
    hierarchy: ["U.S. Supreme Court", "Federal Courts of Appeals", "Federal District Courts", "Bankruptcy and specialist federal courts"],
    officialHosts: ["supremecourt.gov", "pacer.uscourts.gov", "uscourts.gov", "govinfo.gov"],
    gateways: [
      { name: "U.S. Supreme Court Opinions", url: "https://www.supremecourt.gov/opinions/opinions.aspx", scope: "Supreme Court opinions" },
      { name: "PACER Court Opinions", url: "https://pacer.uscourts.gov/find-case/court-opinions", scope: "Federal court opinions" },
    ],
    coverageNote: "This profile is federal. State-law questions require the relevant state court hierarchy and official state source. Publication and precedential rules vary by court.",
  },
  {
    id: "ca",
    jurisdiction: "Canada",
    scope: "Supreme Court of Canada",
    hierarchy: ["Supreme Court of Canada", "Provincial / territorial courts of appeal", "Superior courts", "Provincial / territorial courts and tribunals"],
    officialHosts: ["scc-csc.ca"],
    gateways: [
      { name: "Supreme Court of Canada — Judgments", url: "https://www.scc-csc.ca/judgments-jugements/", scope: "Supreme Court judgments and case materials" },
    ],
    coverageNote: "For non-Supreme Court authorities, identify the province or territory and use its official court source. Quebec private-law questions require bijural analysis.",
  },
  {
    id: "au",
    jurisdiction: "Australia",
    scope: "High Court of Australia",
    hierarchy: ["High Court of Australia", "Federal Court / state and territory appellate courts", "Federal / state and territory trial courts", "Tribunals"],
    officialHosts: ["hcourt.gov.au"],
    gateways: [
      { name: "High Court of Australia — Judgments", url: "https://www.hcourt.gov.au/cases-and-judgments/judgments", scope: "Official High Court judgments" },
    ],
    coverageNote: "For lower courts, identify the Commonwealth, state or territory court and verify against its official publication source.",
  },
  {
    id: "nz",
    jurisdiction: "New Zealand",
    scope: "Courts of New Zealand",
    hierarchy: ["Supreme Court", "Court of Appeal", "High Court", "District Court and specialist courts / tribunals"],
    officialHosts: ["courtsofnz.govt.nz"],
    gateways: [
      { name: "Courts of New Zealand — Judgments", url: "https://www.courtsofnz.govt.nz/judgments/", scope: "Official court judgments" },
    ],
    coverageNote: "Check the deciding court, neutral citation, publication status and any later appellate history.",
  },
  {
    id: "intl",
    jurisdiction: "International",
    scope: "International Court of Justice and selected international judicial material",
    hierarchy: ["International Court of Justice", "Treaty-specific international courts and tribunals"],
    officialHosts: ["icj-cij.org"],
    gateways: [
      { name: "International Court of Justice — Cases", url: "https://www.icj-cij.org/cases", scope: "ICJ contentious cases and advisory proceedings" },
    ],
    coverageNote: "International decisions differ in jurisdiction, parties, treaty basis and legal effect. Do not generalise one tribunal's decision to another regime.",
  },
];

export function getCaseLawProfile(jurisdiction: string): CaseLawSourceProfile | null {
  return CASE_LAW_SOURCES.find((profile) => profile.jurisdiction === jurisdiction) ?? null;
}

export function normalizedCaseLawHost(value: string): string | null {
  try {
    const url = value.includes("://") ? value : `https://${value}`;
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function hostMatchesCaseLawSource(url: string, allowedHosts: string[]): boolean {
  const candidate = normalizedCaseLawHost(url);
  if (!candidate) return false;
  return allowedHosts.some((allowed) => {
    const host = normalizedCaseLawHost(allowed);
    return Boolean(host && (candidate === host || candidate.endsWith(`.${host}`)));
  });
}

export function annotateCaseLawSources(
  sources: WebSource[],
  profile: CaseLawSourceProfile,
): Array<WebSource & { official: boolean }> {
  return sources
    .map((source) => ({ ...source, official: hostMatchesCaseLawSource(source.url, profile.officialHosts) }))
    .sort((a, b) => Number(b.official) - Number(a.official));
}

export function dedupeCaseLawSources(sources: WebSource[]): WebSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = source.url.trim().replace(/\/$/, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
