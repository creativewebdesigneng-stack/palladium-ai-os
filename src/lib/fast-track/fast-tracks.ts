export type FastTrackLink = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export type FastTrack = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  quickActions: FastTrackLink[];
  agents: FastTrackLink[];
  tools: FastTrackLink[];
  workflows: FastTrackLink[];
  skills: FastTrackLink[];
  integrations: FastTrackLink[];
  setup: FastTrackLink[];
};

const link = (id: string, title: string, description: string, href: string): FastTrackLink => ({ id, title, description, href });

export const FAST_TRACKS: FastTrack[] = [
  {
    id: 'gaming',
    name: 'Gaming',
    tagline: 'Build games, worlds and playable experiences.',
    description: 'Bring game planning, coding, agents, visual assets, 3D creation, voice, media and delivery together without leaving PalladiumAI.',
    icon: 'gamepad',
    quickActions: [
      link('game-build', 'Build a new game', 'Start the product and implementation flow in App Studio.', '/tools-framework'),
      link('game-assets', 'Create game assets', 'Generate concept art, environments and cinematic media.', '/media-studio'),
      link('game-3d', 'Create 3D assets', 'Move into the existing 3D creation workspace.', '/three-d-studio'),
    ],
    agents: [
      link('game-agent', 'Game development agent', 'Create a specialist coding and implementation agent.', '/agent-builder'),
      link('game-runtime', 'Long-running build agent', 'Use checkpoints, tools and bounded execution for larger builds.', '/agent-runtime'),
    ],
    tools: [
      link('game-app-studio', 'App Studio', 'Build and iterate on the game application.', '/tools-framework'),
      link('game-media', 'Media Studio', 'Create images and video with the existing generative media lanes.', '/media-studio'),
      link('game-voice', 'Voice Studio', 'Create character voices, narration and audio.', '/voice-studio'),
      link('game-prompts', 'Prompt Workspace', 'Use reusable visual and production prompt collections.', '/prompts'),
    ],
    workflows: [
      link('game-workflows', 'Game production workflows', 'Coordinate multi-stage work and durable hand-offs.', '/workflows'),
      link('game-deploy', 'Build and deployment', 'Inspect deployment state and release outputs.', '/deployments'),
    ],
    skills: [
      link('game-skills', 'Design & coding skills', 'Use audited Taste and implementation playbooks.', '/skills'),
      link('game-knowledge', 'Project knowledge', 'Keep game rules, lore and technical references reusable.', '/knowledge'),
    ],
    integrations: [
      link('game-integrations', 'Development integrations', 'Connect the external services the build needs.', '/integrations'),
      link('game-version', 'Version control', 'Keep source-control work close to the build.', '/version-control'),
    ],
    setup: [
      link('game-model', 'Choose runtime models', 'Configure the model routes agents will use.', '/models'),
      link('game-source', 'Connect source control', 'Connect the repository before starting a production build.', '/version-control'),
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Run customers, operations and company intelligence.',
    description: 'A practical command centre for business agents, CRM, support, research, knowledge, analytics, integrations and automation.',
    icon: 'briefcase',
    quickActions: [
      link('business-research', 'Research a company', 'Use live web and company-intelligence capabilities.', '/web-intelligence'),
      link('business-automate', 'Automate a business process', 'Build an operational workflow with existing controls.', '/business-automation'),
      link('business-crm', 'Work with customers', 'Open the live CRM workspace.', '/crm'),
    ],
    agents: [
      link('business-workforce', 'Business AI workforce', 'Manage the agents working across your company.', '/workforce'),
      link('business-builder', 'Create a specialist agent', 'Create an agent for sales, operations, research or support.', '/agent-builder'),
    ],
    tools: [
      link('business-bi', 'Business Intelligence', 'Turn operational data into decision support.', '/business-intelligence'),
      link('business-support', 'Customer Support', 'Manage customer-support operations.', '/support'),
      link('business-knowledge', 'Knowledge', 'Keep company context available to agents.', '/knowledge'),
      link('business-tables', 'Smart Tables', 'Organise structured operational work.', '/smart-tables'),
    ],
    workflows: [
      link('business-workflows', 'Workflows', 'Run durable multi-step business processes.', '/workflows'),
      link('business-automation-studio', 'Automation', 'Create repeatable operational automations.', '/automation'),
    ],
    skills: [
      link('business-skills', 'Business agent skills', 'Use company-intelligence and operational playbooks.', '/skills'),
      link('business-templates', 'Templates', 'Start from reusable workspace templates.', '/templates'),
    ],
    integrations: [
      link('business-integrations', 'Business integrations', 'Connect CRM, messaging, data and productivity services.', '/integrations'),
      link('business-whatsapp', 'WhatsApp CRM', 'Work with connected WhatsApp customer conversations.', '/whatsapp-crm'),
    ],
    setup: [
      link('business-connect', 'Connect business services', 'Add the systems agents need to work with.', '/integrations'),
      link('business-knowledge-setup', 'Add company knowledge', 'Give agents durable company context before delegating.', '/knowledge'),
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Governed AI operations for larger organisations.',
    description: 'Bring teams, approvals, secure agent execution, policies, integrations, knowledge and durable operational delivery into one governed workspace.',
    icon: 'building',
    quickActions: [
      link('enterprise-workflow', 'Create a governed workflow', 'Build an auditable workflow around existing permissions and approvals.', '/workflows'),
      link('enterprise-runtime', 'Run a governed agent', 'Inspect bounded runtime policy, tool access and telemetry.', '/agent-runtime'),
      link('enterprise-org', 'Manage the organisation', 'Open organisation membership and workspace controls.', '/organisation'),
    ],
    agents: [
      link('enterprise-workforce', 'Enterprise workforce', 'Coordinate agents across organisation work.', '/workforce'),
      link('enterprise-runtime-agents', 'Agent Runtime', 'Use policy-controlled tools, checkpoints and telemetry.', '/agent-runtime'),
    ],
    tools: [
      link('enterprise-mcp', 'MCP Hub', 'Connect approved external tool servers through the existing MCP layer.', '/mcp-hub'),
      link('enterprise-security', 'Security', 'Review security controls for the workspace.', '/security'),
      link('enterprise-knowledge', 'Knowledge', 'Centralise durable organisation context.', '/knowledge'),
      link('enterprise-models', 'Runtime Models', 'Control model-provider routing through the existing gateway.', '/models'),
    ],
    workflows: [
      link('enterprise-delivery', 'Policy-gated delivery', 'Use durable workflows, approvals and verification stages.', '/workflows'),
      link('enterprise-mission', 'Mission Control', 'Monitor active operational work and decisions.', '/mission-control'),
    ],
    skills: [
      link('enterprise-playbooks', 'Enterprise playbooks', 'Use Raven, Ornith and SuperPlane-inspired audited skills.', '/skills'),
      link('enterprise-memory', 'Memory & checkpoints', 'Keep long-horizon work restart-safe and traceable.', '/memory'),
    ],
    integrations: [
      link('enterprise-integrations', 'Enterprise integrations', 'Connect approved external systems through the provider-neutral layer.', '/integrations'),
      link('enterprise-sync', 'Sync Center', 'Manage connected information flows.', '/sync-center'),
    ],
    setup: [
      link('enterprise-team', 'Configure organisation & team', 'Set the people and workspace context first.', '/organisation'),
      link('enterprise-security-setup', 'Review security controls', 'Confirm policy and access before production automation.', '/security'),
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    tagline: 'Launch products and operate an online store.',
    description: 'Put commerce, product content, customer support, media, social publishing, CRM and store integrations into one operating workspace.',
    icon: 'shopping-bag',
    quickActions: [
      link('commerce-launch', 'Launch a product', 'Open Commerce Studio for product and store operations.', '/commerce-studio'),
      link('commerce-media', 'Create product media', 'Generate product imagery and promotional video.', '/media-studio'),
      link('commerce-campaign', 'Create a launch campaign', 'Plan marketing and social activity around the product.', '/marketing'),
    ],
    agents: [
      link('commerce-agent', 'Store operations agent', 'Create an agent for store, catalogue or order work.', '/agent-builder'),
      link('commerce-support-agent', 'Customer support workforce', 'Manage support agents and customer tasks.', '/workforce'),
    ],
    tools: [
      link('commerce-studio', 'Commerce Studio', 'Operate e-commerce work from the existing commerce surface.', '/commerce-studio'),
      link('commerce-crm', 'CRM', 'Manage customers and commercial relationships.', '/crm'),
      link('commerce-prompts', 'Prompt Workspace', 'Create production-ready listing and visual prompts.', '/prompts'),
      link('commerce-social', 'Social Operations', 'Schedule and publish product content.', '/social-operations'),
    ],
    workflows: [
      link('commerce-workflows', 'Commerce workflows', 'Automate repeatable store and marketing processes.', '/workflows'),
      link('commerce-support', 'Customer Support', 'Handle customer conversations and support operations.', '/support'),
    ],
    skills: [
      link('commerce-skills', 'Commerce & design skills', 'Use existing design and operational playbooks.', '/skills'),
      link('commerce-seo', 'SEO Studio', 'Improve discoverability for products and store content.', '/seo-studio'),
    ],
    integrations: [
      link('commerce-shopify', 'Shopify connection', 'Connect Shopify through the existing integration flow.', '/shopify-connect'),
      link('commerce-integrations', 'Store integrations', 'Connect other supported providers and services.', '/integrations'),
    ],
    setup: [
      link('commerce-store-setup', 'Connect your store', 'Connect Shopify or another supported store provider.', '/integrations'),
      link('commerce-social-setup', 'Connect publishing channels', 'Connect the social destinations used for promotion.', '/social-operations'),
    ],
  },
  {
    id: 'social-media',
    name: 'Social Media',
    tagline: 'Plan, create, schedule and publish content.',
    description: 'Combine research, prompts, image/video generation, voice, campaign workflows and connected social publishing in one creator-focused workspace.',
    icon: 'megaphone',
    quickActions: [
      link('social-campaign', 'Plan a campaign', 'Start with the existing marketing workspace.', '/marketing'),
      link('social-create', 'Create image or video', 'Generate campaign assets in Media Studio.', '/media-studio'),
      link('social-publish', 'Schedule & publish', 'Move finished content into Social Operations.', '/social-operations'),
    ],
    agents: [
      link('social-agent', 'Social media agent', 'Create a specialist content or community agent.', '/agent-builder'),
      link('social-workforce', 'Creator workforce', 'Coordinate multiple agents for content operations.', '/workforce'),
    ],
    tools: [
      link('social-ops', 'Social Operations', 'Plan, schedule and publish through connected providers.', '/social-operations'),
      link('social-media-studio', 'Media Studio', 'Create images and video for channels and campaigns.', '/media-studio'),
      link('social-voice', 'Voice Studio', 'Create narration and reusable voice output.', '/voice-studio'),
      link('social-prompts', 'Prompt Workspace', 'Use reusable creative prompt collections.', '/prompts'),
    ],
    workflows: [
      link('social-workflows', 'Content workflows', 'Coordinate creation, approval and publishing stages.', '/workflows'),
      link('social-automation', 'Publishing automation', 'Build repeatable content operations.', '/automation'),
    ],
    skills: [
      link('social-skills', 'Creative skills', 'Use audited design and content-production playbooks.', '/skills'),
      link('social-research', 'Web Intelligence', 'Research topics and sources before creating content.', '/web-intelligence'),
    ],
    integrations: [
      link('social-connect', 'Social connections', 'Connect direct networks or a Postiz-compatible provider.', '/integrations'),
      link('social-creator-hub', 'Creator Hub', 'Work with creator-focused platform capabilities.', '/creator-hub'),
    ],
    setup: [
      link('social-account-setup', 'Connect social accounts', 'Add publishing destinations before scheduling content.', '/social-operations'),
      link('social-model-setup', 'Choose creative models', 'Configure the model routes used for generation.', '/models'),
    ],
  },
  {
    id: 'app-development',
    name: 'App Development',
    tagline: 'Design, build, test and ship software with agents.',
    description: 'A focused software-building workspace combining App Studio, coding agents, skills, source control, models, workflows, testing and deployment.',
    icon: 'code',
    quickActions: [
      link('app-build', 'Build a new app', 'Open App Studio and start the implementation flow.', '/tools-framework'),
      link('app-agent', 'Create a coding agent', 'Create a specialist development agent.', '/agent-builder'),
      link('app-deploy', 'Prepare a deployment', 'Review existing deployment tooling and release state.', '/deployments'),
    ],
    agents: [
      link('app-runtime', 'Agent Runtime', 'Run coding agents with bounded tools, checkpoints and telemetry.', '/agent-runtime'),
      link('app-workspaces', 'Agent Workspaces', 'Coordinate task-specific agent workspaces.', '/agent-workspaces'),
    ],
    tools: [
      link('app-studio', 'App Studio', 'Build applications using the existing tool framework.', '/tools-framework'),
      link('app-html', 'HTML Studio', 'Work directly on web interface output.', '/html-studio'),
      link('app-code', 'Code Explorer', 'Inspect and navigate application code.', '/code-explorer'),
      link('app-models', 'Runtime Models', 'Choose and route coding-capable models.', '/models'),
    ],
    workflows: [
      link('app-workflows', 'Development workflows', 'Coordinate build, test, approval and delivery.', '/workflows'),
      link('app-deployments', 'Deployments', 'Track and manage release outputs.', '/deployments'),
    ],
    skills: [
      link('app-skills', 'Development & design skills', 'Use image-to-code, redesign and implementation playbooks.', '/skills'),
      link('app-prompts', 'Prompt Workspace', 'Keep reusable build and design prompts organised.', '/prompts'),
    ],
    integrations: [
      link('app-version', 'Version control', 'Work with connected source repositories.', '/version-control'),
      link('app-integrations', 'Developer integrations', 'Connect services the application needs.', '/integrations'),
    ],
    setup: [
      link('app-source-setup', 'Connect source control', 'Connect the repository before delegating code changes.', '/version-control'),
      link('app-model-setup', 'Configure models', 'Choose the model routes used by development agents.', '/models'),
    ],
  },
];

export const FAST_TRACK_IDS = FAST_TRACKS.map((track) => track.id);

export function getFastTrack(id: string) {
  return FAST_TRACKS.find((track) => track.id === id) ?? null;
}
