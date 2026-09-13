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
    id: "fr",
    jurisdiction: "France",
    scope: "Published French judicial and administrative case-law available through the official Légifrance service",
    hierarchy: ["Cour de cassation / Conseil d'État", "Courts of appeal / administrative courts of appeal", "Published lower-court and administrative decisions where available"],
    officialHosts: ["legifrance.gouv.fr"],
    gateways: [
      { name: "Légifrance", url: "https://www.legifrance.gouv.fr/", scope: "Official legislation and published jurisprudence" },
    ],
    coverageNote: "France has separate judicial and administrative court orders. Publication coverage varies; confirm the deciding formation, date, appeal history and later interpretation before relying on a decision.",
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
    id: "in",
    jurisdiction: "India",
    scope: "Supreme Court of India",
    hierarchy: ["Supreme Court of India", "High Courts", "Subordinate courts and specialist tribunals"],
    officialHosts: ["sci.gov.in"],
    gateways: [
      { name: "Supreme Court of India", url: "https://www.sci.gov.in/", scope: "Official Supreme Court judgments and case materials" },
    ],
    coverageNote: "This configured source is Supreme Court-focused. High Court and lower-court questions require the relevant court's official source. Verify bench, citation, procedural history and later treatment before relying on an authority.",
  },
  {
    id: "sg",
    jurisdiction: "Singapore",
    scope: "Singapore Judiciary published judgments",
    hierarchy: ["Court of Appeal", "High Court", "State Courts", "Specialist courts and tribunals where applicable"],
    officialHosts: ["judiciary.gov.sg"],
    gateways: [
      { name: "Singapore Courts — Judgments", url: "https://www.judiciary.gov.sg/judgments", scope: "Official published judgments" },
    ],
    coverageNote: "Confirm the deciding court, publication status, citation and any later appellate or distinguishing treatment. Not every disposition or tribunal decision is necessarily represented in the same publication channel.",
  },
  {
    id: "hk",
    jurisdiction: "Hong Kong SAR",
    scope: "Hong Kong Judiciary court judgments and legal-reference material",
    hierarchy: ["Court of Final Appeal", "Court of Appeal / Court of First Instance", "District Court and specialist courts / tribunals"],
    officialHosts: ["judiciary.hk"],
    gateways: [
      { name: "Hong Kong Judiciary", url: "https://www.judiciary.hk/", scope: "Official court judgments and legal-reference material" },
    ],
    coverageNote: "Confirm the deciding court, language/version, neutral citation where available, appellate history and later treatment. A published judgment does not by itself establish that it controls the user's facts.",
  },
  {
    id: "jp",
    jurisdiction: "Japan",
    scope: "Courts in Japan published judgment material",
    hierarchy: ["Supreme Court", "High Courts", "District / Family Courts", "Summary Courts"],
    officialHosts: ["courts.go.jp"],
    gateways: [
      { name: "Courts in Japan — Judgments", url: "https://www.courts.go.jp/english/Judgments/", scope: "Official judiciary-hosted judgment material" },
    ],
    coverageNote: "English materials and translations may be unofficial or selective. Consequential analysis should verify the authoritative Japanese decision, deciding court, procedural history and later treatment.",
  },
  {
    id: "kr",
    jurisdiction: "South Korea",
    scope: "Supreme Court of Korea published court material",
    hierarchy: ["Supreme Court", "High Courts", "District Courts and specialist courts"],
    officialHosts: ["scourt.go.kr"],
    gateways: [
      { name: "Supreme Court of Korea", url: "https://www.scourt.go.kr/eng/", scope: "Official Supreme Court and judiciary material" },
    ],
    coverageNote: "Verify the authoritative Korean text, deciding court, case number, date, procedural posture and later treatment. Constitutional Court authority is a separate institutional source and is not implied by this profile.",
  },
  {
    id: "ke",
    jurisdiction: "Kenya",
    scope: "Kenya Law reports and official Judiciary material",
    hierarchy: ["Supreme Court", "Court of Appeal", "High Court and courts of equal status", "Subordinate courts and tribunals"],
    officialHosts: ["kenyalaw.org", "judiciary.go.ke"],
    gateways: [
      { name: "Kenya Law", url: "https://new.kenyalaw.org/", scope: "Official law reports, judgments and consolidated legal material" },
      { name: "Kenya Judiciary", url: "https://judiciary.go.ke/", scope: "Official judiciary and court material" },
    ],
    coverageNote: "Confirm the deciding court, citation, date and appellate history. Kenya Law is an official law-reporting source, but later treatment and factual applicability still require separate verification.",
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
