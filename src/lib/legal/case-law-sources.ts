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
    id: "ie",
    jurisdiction: "Ireland",
    scope: "Irish courts with published judgments through the Courts Service",
    hierarchy: ["Supreme Court", "Court of Appeal", "High Court", "Circuit / District and specialist courts where published"],
    officialHosts: ["courts.ie"],
    gateways: [
      { name: "Courts Service — Judgments", url: "https://www2.courts.ie/Judgments", scope: "Published Irish court judgments, including neutral-citation search" },
    ],
    coverageNote: "Publication coverage varies by court and case. Confirm the deciding court, neutral citation, appellate history and whether a later decision affects the authority.",
  },
  {
    id: "fr",
    jurisdiction: "France",
    scope: "French ordre judiciaire decisions available through the Cour de cassation Judilibre service",
    hierarchy: ["Cour de cassation", "Cours d'appel", "Tribunaux judiciaires / first-instance courts where published"],
    officialHosts: ["courdecassation.fr"],
    gateways: [
      { name: "Judilibre — Cour de cassation", url: "https://www.courdecassation.fr/recherche-judilibre", scope: "Open-data decisions from the judicial order" },
    ],
    coverageNote: "This profile is for the judicial order. Administrative-law questions require Conseil d'État / administrative-court sources, and constitutional review requires Conseil constitutionnel sources. Publication labels and chamber/formations matter.",
  },
  {
    id: "de",
    jurisdiction: "Germany",
    scope: "German Federal Constitutional Court decisions",
    hierarchy: ["Federal Constitutional Court (Bundesverfassungsgericht)", "Other federal supreme courts by subject", "Länder courts"],
    officialHosts: ["bundesverfassungsgericht.de"],
    gateways: [
      { name: "Bundesverfassungsgericht — Decisions", url: "https://www.bundesverfassungsgericht.de/EN/Decisions/decisions_node.html", scope: "Federal Constitutional Court decisions and selected translations" },
    ],
    coverageNote: "This profile covers constitutional-court material only. Germany has separate federal supreme courts by subject. English translations are informational; verify the authoritative German decision and exact legal effect.",
  },
  {
    id: "in",
    jurisdiction: "India",
    scope: "Supreme Court of India judgments and official Supreme Court Reports search",
    hierarchy: ["Supreme Court of India", "High Courts", "Subordinate courts and tribunals"],
    officialHosts: ["sci.gov.in"],
    gateways: [
      { name: "Supreme Court Reports Search", url: "https://scr.sci.gov.in/scrsearch/", scope: "Official Supreme Court judgments and orders search" },
      { name: "Supreme Court of India", url: "https://www.sci.gov.in/", scope: "Supreme Court judgments, orders and court material" },
    ],
    coverageNote: "High Court and tribunal questions require the relevant official court source. Judgment summaries are aids and do not replace the judgment or reasons. Verify later treatment and any review or larger-bench decision.",
  },
  {
    id: "sg",
    jurisdiction: "Singapore",
    scope: "Singapore Courts written judgments and selected case summaries",
    hierarchy: ["Court of Appeal", "High Court", "State Courts", "Family Justice Courts and specialist courts where applicable"],
    officialHosts: ["judiciary.gov.sg"],
    gateways: [
      { name: "Singapore Courts — Judgments", url: "https://www.judiciary.gov.sg/judgments", scope: "Written judgments and selected court case summaries" },
    ],
    coverageNote: "Distinguish a written judgment from a summary, brief reason or case highlight. Confirm the court, publication status, appellate route and later treatment before relying on precedential weight.",
  },
  {
    id: "hk",
    jurisdiction: "Hong Kong SAR",
    scope: "Hong Kong Judiciary judgments and rulings",
    hierarchy: ["Court of Final Appeal", "High Court (Court of Appeal / Court of First Instance)", "District Court", "Magistrates' and specialist courts / tribunals"],
    officialHosts: ["judiciary.hk"],
    gateways: [
      { name: "Hong Kong Judiciary — Judgments", url: "https://www.judiciary.hk/en/judgments_legal_reference/judgments.html", scope: "Judgments, rulings and legal-reference material" },
    ],
    coverageNote: "Not every judgment is available online. Confirm the deciding court, language/version, appellate history and whether a verified copy or later judgment changes the position.",
  },
  {
    id: "jp",
    jurisdiction: "Japan",
    scope: "Supreme Court of Japan judgments and selected translated judgments",
    hierarchy: ["Supreme Court", "High Courts", "District / Family Courts", "Summary Courts"],
    officialHosts: ["courts.go.jp"],
    gateways: [
      { name: "Supreme Court of Japan — Judgment Search", url: "https://www.courts.go.jp/english/Judgments/search/index.html", scope: "Supreme Court and selected translated judgments" },
    ],
    coverageNote: "English translations on the Supreme Court website are explicitly unofficial. Verify the authoritative Japanese judgment, court, date, case number and any later treatment before relying on a translated text.",
  },
  {
    id: "kr",
    jurisdiction: "South Korea",
    scope: "Supreme Court of Korea decisions and public judgment-access services",
    hierarchy: ["Supreme Court", "High Courts", "District Courts", "Specialised courts"],
    officialHosts: ["scourt.go.kr"],
    gateways: [
      { name: "Supreme Court of Korea — Decisions", url: "https://www.scourt.go.kr/eng/supreme/decisions/NewDecisionsList.work?mode=1", scope: "Supreme Court decision listings" },
      { name: "Korean Judiciary — Public Judgment Access", url: "https://www.scourt.go.kr/eng/judiciary/eCourt/public.jsp", scope: "Official public judgment-access information" },
    ],
    coverageNote: "Online public access is subject to publication and anonymisation rules. English-language material may be selective; verify the Korean decision and full procedural history for consequential use.",
  },
  {
    id: "za",
    jurisdiction: "South Africa",
    scope: "Constitutional Court of South Africa decisions",
    hierarchy: ["Constitutional Court", "Supreme Court of Appeal", "High Courts", "Lower and specialist courts"],
    officialHosts: ["concourt.org.za"],
    gateways: [
      { name: "Constitutional Court Repository", url: "https://collections.concourt.org.za/handle/20.500.12144/1", scope: "Constitutional Court cases and judgments" },
    ],
    coverageNote: "This configured official source covers the Constitutional Court. Supreme Court of Appeal, High Court and specialist-court issues require their own authoritative source checks. Verify later treatment and the precise constitutional or statutory issue decided.",
  },
  {
    id: "br",
    jurisdiction: "Brazil",
    scope: "Brazilian Supremo Tribunal Federal jurisprudence",
    hierarchy: ["Supremo Tribunal Federal", "Superior courts by subject", "Federal / state appellate courts", "Trial courts"],
    officialHosts: ["stf.jus.br"],
    gateways: [
      { name: "STF — Jurisprudência", url: "https://portal.stf.jus.br/Jurisprudencia/", scope: "Supremo Tribunal Federal jurisprudence and full published decisions" },
    ],
    coverageNote: "This profile covers the STF. Brazil has other superior courts with subject-specific jurisdiction. Verify the court, procedural vehicle, publication, binding-súmula/repercussão status where relevant, and later treatment.",
  },
  {
    id: "mx",
    jurisdiction: "Mexico",
    scope: "Suprema Corte de Justicia de la Nación decisions and jurisprudential theses",
    hierarchy: ["Suprema Corte de Justicia de la Nación", "Federal collegiate / circuit courts", "District courts", "State courts"],
    officialHosts: ["scjn.gob.mx"],
    gateways: [
      { name: "SCJN — Sentencias y Datos de Expedientes", url: "https://www2.scjn.gob.mx/ConsultaTematica/PaginasPub/TematicaPub.aspx", scope: "Supreme Court case records and full resolved matters" },
      { name: "SCJN — Resoluciones relevantes", url: "https://www.scjn.gob.mx/transparencia/transparencia-ciudadana/Resoluciones-relevantes-de-la-SCJN", scope: "Selected significant Supreme Court resolutions" },
    ],
    coverageNote: "Distinguish a judgment from an isolated thesis, jurisprudential thesis and other publication categories. Confirm the chamber/plenary body, era, binding status and later doctrinal changes before relying on authority.",
  },
  {
    id: "ae",
    jurisdiction: "United Arab Emirates",
    scope: "UAE Federal Supreme Court decisions and Ministry of Justice federal legal portal",
    hierarchy: ["Federal Supreme Court", "Federal Courts of Appeal", "Federal Courts of First Instance", "Local emirate courts and free-zone courts where separately competent"],
    officialHosts: ["moj.gov.ae", "elaws.moj.gov.ae"],
    gateways: [
      { name: "UAE Ministry of Justice — Federal Supreme Court", url: "https://www.moj.gov.ae/en/about-moj/federal-supreme-court.aspx", scope: "Federal Supreme Court information and technical-office publications" },
      { name: "UAE Legal Portal — Federal Supreme Court Decisions", url: "https://elaws.moj.gov.ae/", scope: "Federal Supreme Court decisions and federal legal materials" },
    ],
    coverageNote: "This profile is federal. Dubai, Abu Dhabi and other local judicial authorities, plus DIFC/ADGM and other free-zone courts, can have separate jurisdiction and precedent rules. Automated translations are not authoritative; verify the Arabic decision where material.",
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
