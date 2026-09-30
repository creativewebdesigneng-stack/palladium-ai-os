export type AcceptanceCategory =
  | "owner"
  | "provider"
  | "device"
  | "transaction"
  | "professional"
  | "independent"
  | "conditional";

export type AcceptanceItem = {
  id: `U${string}`;
  title: string;
  category: AcceptanceCategory;
  dependency: string;
  evidence: string;
  path: string;
  action: string;
  priority?: "owner-first";
  evidenceKeys?: string[];
};

export const OPERATIONAL_ACCEPTANCE_ITEMS: AcceptanceItem[] = [
  { id: "U01", title: "Memory recall", category: "owner", dependency: "Real owner memory or authorised document", evidence: "A genuine saved record is recalled only inside the correct owner, agent and preference scope.", path: "/memory", action: "Open Memory", priority: "owner-first", evidenceKeys: ["agentMemories"] },
  { id: "U02", title: "Task recovery", category: "conditional", dependency: "A safe real agent task", evidence: "Persisted run, cancellation and recovery state match the real visible task outcome.", path: "/tasks", action: "Open Tasks" },
  { id: "U03", title: "Astra qualification", category: "independent", dependency: "Exact pinned model plus independent evaluator", evidence: "A genuine model run produces benchmark evidence that satisfies the defined qualification floor.", path: "/model-arena", action: "Open Model Arena" },
  { id: "U04", title: "160 agent skills", category: "owner", dependency: "Owner workspace installation", evidence: "The intended skill pack is installed and a governed agent run uses a selected playbook without extra authority.", path: "/skills", action: "Open Skills", priority: "owner-first", evidenceKeys: ["agentSkills"] },
  { id: "U05", title: "AI Workbench", category: "provider", dependency: "Live model access under the owner plan", evidence: "Representative Workbench tasks return real provider responses and do not claim unperformed actions.", path: "/ai-workbench", action: "Open Workbench" },
  { id: "U06", title: "Connected actions", category: "provider", dependency: "Official OAuth or provider grant", evidence: "Blackstar detects actual scopes and a permitted read or approved write returns provider evidence.", path: "/integrations", action: "Open Integrations" },
  { id: "U07", title: "Cinema rendering", category: "provider", dependency: "Genuine rendering worker/provider", evidence: "A provider actually renders and assembles a playable agreed sample.", path: "/cinema-studio", action: "Open Cinema Studio", evidenceKeys: ["cinemaShotRenders", "mediaGenerationJobs"] },
  { id: "U08", title: "Game Foundry runtime", category: "provider", dependency: "Real worker or licensed external engine", evidence: "A generated asset or game export opens or runs in the selected supported engine.", path: "/game-foundry", action: "Open Game Foundry", evidenceKeys: ["gameFoundryProjects", "threeDJobs"] },
  { id: "U09", title: "Trading provider coverage", category: "provider", dependency: "Official market feed or authorised brokerage", evidence: "The provider advertises the requested capability and returns verified current observations or authorised status.", path: "/trading-hub", action: "Open Trading Hub", evidenceKeys: ["tradingSimulations", "tradingWatchlists", "tradingJournalEntries"] },
  { id: "U10", title: "Marketplace settlement", category: "transaction", dependency: "Stripe business onboarding and approved real-money test", evidence: "Provider-confirmed listing fee, webhook, payout/refund and dispute lifecycle matches the commercial rules.", path: "/marketplace", action: "Open Marketplace", evidenceKeys: ["marketplaceOrders", "marketplacePaymentEvents"] },
  { id: "U11", title: "Website publication", category: "provider", dependency: "Real hosting/domain control", evidence: "The reviewed site resolves and displays at the intended published domain.", path: "/website-studio", action: "Open Website Studio" },
  { id: "U12", title: "Construction acceptance", category: "professional", dependency: "Qualified reviewer and authorised real-world data/hardware", evidence: "The exact safety-critical workflow receives competent-person review and recorded human sign-off.", path: "/construction-industrial-hub", action: "Open Construction Hub" },
  { id: "U13", title: "Retail connected operations", category: "provider", dependency: "Merchant channel plus consenting test recipient", evidence: "A real approved reminder or bounded provider outcome is recorded.", path: "/retail-hub", action: "Open Retail Hub", evidenceKeys: ["retailCallInbox"] },
  { id: "U14", title: "Inbound phone receptionist", category: "provider", dependency: "Carrier number, signed webhook and permitted test call", evidence: "A signed inbound call reaches the receptionist and consequential actions remain approval-gated.", path: "/phone-communications", action: "Open Phone & Voice", evidenceKeys: ["communicationCallSessions"] },
  { id: "U15", title: "Dropshipping provider writes", category: "provider", dependency: "Real merchant/supplier consent", evidence: "A permitted provider write returns a genuine listing or provider evidence identifier.", path: "/dropshipping-hub", action: "Open Dropshipping Hub" },
  { id: "U16", title: "Food delivery partner access", category: "provider", dependency: "Official partner API rights", evidence: "The provider grants the advertised regional scopes and a permitted test succeeds.", path: "/integrations", action: "Open Integrations" },
  { id: "U17", title: "Native mobile bridge", category: "device", dependency: "Eligible physical iOS or Android device", evidence: "The paired device reports genuine capabilities and a safe native task or fallback succeeds.", path: "/integrations", action: "Open Integrations", evidenceKeys: ["mobileIntelligenceDevices"] },
  { id: "U18", title: "Company real-data acceptance", category: "owner", dependency: "Real owner-entered business records", evidence: "Visible KPIs and handoffs agree with the source records in the owner workspace.", path: "/company-hub", action: "Open Company Hub" },
  { id: "U19", title: "Qualified legal/compliance review", category: "professional", dependency: "Appropriate qualified professional", evidence: "A dated reviewed record supports the exact jurisdiction and consequential decision.", path: "/compliance-sentinel", action: "Open Compliance Sentinel" },
  { id: "U20", title: "Repository two-user permissions", category: "owner", dependency: "A real authorised collaborator", evidence: "The collaborator sees only the selected project and revocation actually removes access.", path: "/projects", action: "Open Projects" },
  { id: "U21", title: "Phone context disclosure", category: "provider", dependency: "Consenting real call and selected project/company context", evidence: "The real call uses only explicitly selected context and discloses no unrelated records.", path: "/phone-communications", action: "Open Phone & Voice", evidenceKeys: ["communicationCallSessions"] },
  { id: "U22", title: "Device visual sign-off", category: "device", dependency: "Owner review on a real target device", evidence: "The intended premium Blackstar experience is accepted at the actual viewport and motion settings.", path: "/dashboard", action: "Open Dashboard" },
  { id: "U23", title: "Hosted Auth security setting", category: "owner", dependency: "Owner-controlled Supabase Auth setting", evidence: "Leaked-password protection is observed enabled in the hosted Auth configuration and behaviour.", path: "/admin/security", action: "Open Security", priority: "owner-first" },
  { id: "U24", title: "Enterprise/on-prem scope", category: "conditional", dependency: "Explicit release scope and available environment", evidence: "The selected paid/on-prem/edge capability and environment are explicit before certification.", path: "/ai-hub", action: "Open AI Hub" },
];

export const ACCEPTANCE_EVIDENCE_TABLES = {
  agentMemories: "agent_memories",
  agentSkills: "agent_skills",
  marketplaceOrders: "marketplace_orders",
  marketplacePaymentEvents: "marketplace_payment_events",
  cinemaShotRenders: "cinema_shot_renders",
  mediaGenerationJobs: "media_generation_jobs",
  gameFoundryProjects: "game_foundry_projects",
  threeDJobs: "three_d_jobs",
  communicationCallSessions: "communication_call_sessions",
  mobileIntelligenceDevices: "mobile_intelligence_devices",
  retailCallInbox: "retail_call_inbox",
  tradingSimulations: "trading_simulations",
  tradingWatchlists: "trading_watchlists",
  tradingJournalEntries: "trading_journal_entries",
} as const;
