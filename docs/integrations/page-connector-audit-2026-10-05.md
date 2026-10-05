# Blackstar page connector audit — 5 October 2026

## Purpose

Map Blackstar's authenticated product surfaces to the strongest currently observed ChatGPT connectors and to Blackstar's existing provider architecture.

This document is a discovery and routing record, not execution evidence.

Rules:

- ChatGPT connector availability does not transfer a credential, OAuth grant or account session into Blackstar.
- Blackstar must use the provider's own API, MCP, OAuth or an approved connector transport.
- Existing Blackstar integrations remain authoritative; do not create a duplicate connector stack.
- "Candidate" means a strong current catalogue match only.
- "Connector target" means Blackstar already has a provider identity/capability target but not necessarily a live executable user connection.
- External writes remain governed by Blackstar approvals, scopes, audit, budgets and provider policy.
- Provider discovery, endpoint readiness or account presence never implies a transaction, render, post, message, deployment or certification occurred.

## Existing Blackstar connector foundation

Already implemented as first-class or governed Blackstar routes:

- Google Workspace
- Microsoft 365
- Slack
- GitHub
- HubSpot
- Salesforce
- Notion
- Asana
- Linear
- Shopify
- Meta / Instagram
- YouTube
- LinkedIn
- Pinterest
- TikTok
- X
- Threads
- Stripe platform payments

Already registered as governed creative connector targets:

- Canva
- Figma
- Hugging Face
- Adobe
- Runway
- Higgsfield

## Strong ChatGPT catalogue matches found during this audit

The current ChatGPT catalogue also exposed useful matches including Vercel, Supabase, Lovable, Webflow, Atlassian, Semrush, Ahrefs, Supermetrics, Metricool, Airtable, Coda, Dropbox, Box, SharePoint, Mercury, Datadog, Amplitude, PostHog, Vanta, RingCentral, HeyGen, COROS, Caliber, Klaviyo and vidIQ.

These are not Blackstar integrations merely because they exist in ChatGPT.

## Page families and best-fit connectors

### Command, operations and company pages

Routes:
`/dashboard`, `/mission-control`, `/outcomes`, `/business-intelligence`,
`/decision-studio`, `/business-automation`, `/work-os`, `/tasks`,
`/automation`, `/automations`, `/workflows`, `/organisation`, `/team`,
`/company-hub`.

Best fit:
Google Workspace, Microsoft 365, Slack, Notion, Asana, Linear and HubSpot.
Airtable and Coda are strong catalogue candidates for structured operational data and operating documents.

### Agents, Workforce and AI pages

Routes:
`/agents*`, `/agent-builder`, `/agent-runtime`, `/agent-workspaces`,
`/workforce`, `/skills`, `/ai-tools`, `/ai-workbench`, `/ai-builder`,
`/ai-hub`, `/ai-model-hub`, `/models`, `/model-arena`, `/mcp-hub`,
`/autonomous-os`, `/prompts`, `/chat`, `/tools-framework`.

Best fit:
GitHub, Hugging Face, Google Workspace, Slack, Notion, Asana and Linear.

### Developer, source and deployment pages

Routes:
`/developer`, `/developer-workspace`, `/developer-portal`,
`/code-explorer`, `/version-control`, `/deployments`, `/terminal`,
`/browser-preview`, `/computer-control`, `/builder`.

Best fit:
GitHub and Figma are direct Blackstar matches.
Hugging Face is useful for model/dev workflows.
Current ChatGPT candidates: Vercel, Supabase, Lovable, Atlassian and Datadog.

### Creative, website, Cinema, Game and 3D pages

Routes:
`/creator-hub`, `/creator-marketplace`, `/creators*`, `/media-studio`,
`/cinema-studio`, `/three-d-studio`, `/game-foundry`, `/voice-studio`,
`/html-studio`, `/website-studio`, `/templates`.

Best fit:
Canva, Figma, Hugging Face, Adobe, Runway, Higgsfield and GitHub.
Lovable and Webflow are strong catalogue candidates for app/site-building, CMS and publishing workflows.
HeyGen is a strong candidate for avatar-led video, speech, lip-sync and multilingual localization.

Execution boundary:
creative model discovery or a configured endpoint is not evidence that media or 3D output was generated.

### Marketing, social, SEO and research pages

Routes:
`/marketing`, `/social-operations`, `/trusted-social-video`, `/seo-studio`,
`/product-analytics`, `/analytics`, `/news-research`, `/web-intelligence`,
`/research`, `/web`.

Best fit:
Meta, YouTube, LinkedIn, Pinterest, TikTok, X, Threads and Canva.

Strong current ChatGPT candidates:
Semrush, Ahrefs, Supermetrics, Metricool, Amplitude, PostHog, HeyGen, Klaviyo and vidIQ.

### CRM, customer support and communications pages

Routes:
`/crm`, `/crm-studio`, `/whatsapp-crm`, `/phone-communications`,
`/support`, `/notifications`.

Best fit:
HubSpot, Salesforce, Slack, Google Workspace and Microsoft 365.
RingCentral is a strong current catalogue candidate for calls/SMS/voicemail.

### Commerce, Retail, Dropshipping and Marketplace pages

Routes:
`/commerce-studio`, `/dropshipping-hub`, `/retail-hub`,
`/shopify-connect`, `/marketplace`, `/agent-marketplace`,
`/ai-marketplace`, `/tool-marketplace`, `/admin/marketplace`.

Best fit:
Shopify and Blackstar's native Stripe infrastructure.
HubSpot, Google Workspace and Meta provide business/customer context.
Supermetrics and Klaviyo are useful catalogue candidates for commerce analytics and lifecycle marketing.

Blackstar's existing Etsy/eBay/WooCommerce/Amazon connector transports remain valid even though they were not the strongest ChatGPT catalogue matches in this audit.

### Finance, billing, quant and trading pages

Routes:
`/finance`, `/trading-hub`, `/quant-studio`, `/billing`, `/payment`,
`/admin/subscriptions`.

Best fit:
Blackstar native Stripe for billing/payment workflows.
Google Workspace and Microsoft 365 for user documents and reporting.
Mercury is a current catalogue candidate for finance context.

No unrestricted autonomous movement of money is introduced by this mapping.
Blackstar's trading data/provider contracts remain authoritative.

### Files, documents, knowledge and memory pages

Routes:
`/files`, `/files-analysis`, `/documents`, `/knowledge`, `/memory`,
`/recall-notes`, `/smart-tables`, `/shared-intelligence`, `/search`.

Best fit:
Google Workspace, Microsoft 365 and Notion.

Strong current ChatGPT candidates:
Dropbox, Box, SharePoint, Airtable and Coda.

### Projects and collaboration pages

Routes:
`/projects*`, `/developer-workspace`.

Best fit:
GitHub, Google Workspace, Notion, Asana, Linear and Slack.
Atlassian is a strong current catalogue candidate.

### Industry, construction, legal and compliance pages

Routes:
`/industry-hub`, `/construction-industrial-hub`, `/legal-hub`,
`/compliance-sentinel`.

Best fit:
Google Workspace, Microsoft 365, Notion, Slack and Asana.
Vanta is a strong current catalogue candidate for compliance controls/evidence.

For Legal/Compliance, current source-backed jurisdictional data remains mandatory; a connector does not make coverage universally current.

### Health and fitness pages

Routes:
`/health-fitness`, `/fitness-studio`.

Current catalogue candidates:
COROS and Caliber.
Google Workspace can still support user-owned documents/plans.

No health connector is treated as connected or clinically authoritative without a real supported account/data route.

### Security, monitoring and operational acceptance pages

Routes:
`/security`, `/admin/security`, `/admin/monitoring`, `/admin/audit-logs`,
`/admin/acceptance`, `/admin/platform-analytics`.

Best fit:
GitHub plus current ChatGPT candidates Vercel, Supabase, Datadog, Amplitude, PostHog and Vanta.

These are operational data sources only; readiness data is not acceptance certification.

### Integrations and synchronization pages

Routes:
`/integrations`, `/sync-center`, `/admin/integrations`.

Best fit:
Google Workspace, Microsoft 365, Slack, GitHub, HubSpot, Shopify, Notion, Asana and Linear.

This remains the canonical Blackstar connection surface.

### Admin, docs and general workspace pages

Routes:
`/admin`, `/admin/users`, `/admin/organisations`, `/admin/system-settings`,
`/docs`, `/discovery`, `/fast-track`, `/human-frontier`, `/settings`.

Best fit:
Google Workspace, Microsoft 365, Slack, GitHub and Notion.
Vercel and Supabase are useful admin/deployment candidates where the user owns the relevant external account.

## Implementation approach

Blackstar now uses a shared route-to-connector recommendation map instead of duplicating connector logic inside every screen.

The shared UI must:

1. show only best-fit providers for the active route;
2. label existing Blackstar support separately from connector targets and candidates;
3. link back to the canonical Integrations page;
4. never say a candidate is connected;
5. never transfer or imply access to ChatGPT's connector credentials;
6. keep provider writes behind Blackstar approval/audit policy.

Future provider work should promote a connector from candidate -> target/supported only after a real provider API/MCP/OAuth implementation and its runtime tests exist.
