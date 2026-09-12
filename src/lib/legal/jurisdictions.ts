export const JURISDICTIONS=[
{id:"uk",name:"United Kingdom",system:"Common law with devolved legal systems",levels:["UK Parliament","Devolved legislatures","Secondary legislation","Courts"],primary:["https://www.legislation.gov.uk/","https://caselaw.nationalarchives.gov.uk/"],notes:"Check whether the issue falls under England & Wales, Scotland or Northern Ireland and whether competence is devolved."},
{id:"eu",name:"European Union",system:"Supranational legal order",levels:["EU treaties","Regulations","Directives","Decisions","CJEU case law"],primary:["https://eur-lex.europa.eu/","https://curia.europa.eu/"],notes:"Determine whether EU law applies directly, requires national implementation, or interacts with member-state law."},
{id:"us",name:"United States",system:"Federal system with federal and state law",levels:["Constitution","Federal statutes","Federal regulations","State law","Federal/state courts"],primary:["https://www.congress.gov/","https://uscode.house.gov/","https://www.federalregister.gov/"],notes:"Identify the relevant state and whether federal law pre-empts, supplements or leaves the issue to state law."},
{id:"ca",name:"Canada",system:"Federal bijural system",levels:["Constitution","Federal statutes","Provincial/territorial law","Regulations","Courts"],primary:["https://laws-lois.justice.gc.ca/"],notes:"Identify whether jurisdiction lies with the federal government or a province/territory; Quebec private law differs from common-law provinces."},
{id:"au",name:"Australia",system:"Federal common-law system",levels:["Constitution","Commonwealth legislation","State/territory law","Regulations","Courts"],primary:["https://www.legislation.gov.au/"],notes:"Check Commonwealth versus state/territory competence and the relevant regulator or tribunal."},
{id:"nz",name:"New Zealand",system:"Common-law parliamentary system",levels:["Acts","Secondary legislation","Courts","Regulators"],primary:["https://www.legislation.govt.nz/"],notes:"Start with current consolidated legislation and then verify relevant court and regulator materials."},
{id:"intl",name:"International",system:"Treaty and customary international law framework",levels:["Treaties","Customary international law","Institutional rules","International tribunals"],primary:["https://treaties.un.org/","https://www.icj-cij.org/"],notes:"Confirm treaty status, reservations, territorial application and whether the instrument is binding on the states involved."},
{id:"ip",name:"International IP",system:"Treaty-based and national IP systems",levels:["WIPO treaties","National statutes","Regional systems","Courts/offices"],primary:["https://www.wipo.int/wipolex/"],notes:"IP rights are territorial. Identify the country or regional right, registration status and applicable treaty framework."}
];
export const AUTHORITY_ORDER=[
"Constitutional or treaty text where applicable",
"Current enacted legislation / binding regulation",
"Binding appellate or supreme-court authority",
"Relevant regulator rules or legally binding decisions",
"Official guidance and explanatory materials",
"Bills, consultations and proposals",
"Secondary commentary and practitioner analysis"
];