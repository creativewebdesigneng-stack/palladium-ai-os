import fs from 'node:fs';

const pub = [
  ['index', 'Landing', '/', 'PalladiumAI — The AI Operating System', 'PalladiumAI is the AI operating system for autonomous work: agents, workflows, and an AI workforce that runs your business.'],
  ['features', 'Features', '/features', 'Features — PalladiumAI', 'Explore the PalladiumAI platform: agent orchestration, automation studio, memory, tools and enterprise controls.'],
  ['ai-agents', 'AIAgents', '/ai-agents', 'AI Agents — PalladiumAI', 'Hire, configure and deploy specialised AI agents that plan, use tools and complete real work autonomously.'],
  ['tools', 'AIToolsPublic', '/tools', 'AI Tools — PalladiumAI', 'A growing library of AI tools and integrations your agents can use across research, code, sales and operations.'],
  ['business', 'Business', '/business', 'For Business — PalladiumAI', 'Run finance, marketing, support and operations with an autonomous AI workforce built for business outcomes.'],
  ['developers', 'Developers', '/developers', 'Developers — PalladiumAI', 'APIs, SDKs, MCP support and a developer workspace for building on the PalladiumAI operating system.'],
  ['resources', 'Resources', '/resources', 'Resources — PalladiumAI', 'Guides, templates, changelog and research to help you get the most out of your AI workforce.'],
  ['help', 'HelpCentre', '/help', 'Help Centre — PalladiumAI', 'Answers, troubleshooting and onboarding help for the PalladiumAI operating system.'],
  ['pricing', 'Pricing', '/pricing', 'Pricing — PalladiumAI', 'Simple plans that scale from a single operator to an enterprise AI workforce. Start free.'],
  ['payment', 'Payment', '/payment', 'Checkout — PalladiumAI', 'Complete your PalladiumAI subscription and activate your AI workforce.'],
  ['403', 'Forbidden', '/403', 'Access denied — PalladiumAI', 'You do not have permission to view this page.'],
  ['500', 'ServerError', '/500', 'Something went wrong — PalladiumAI', 'An unexpected error occurred. Our systems are on it.'],
];

const auth = [
  ['login', 'Login', '/login', 'Sign in — PalladiumAI', 'Sign in to your PalladiumAI workspace and resume your AI workforce.'],
  ['register', 'Register', '/register', 'Create account — PalladiumAI', 'Create your PalladiumAI account and deploy your first AI agents in minutes.'],
  ['forgot-password', 'ForgotPassword', '/forgot-password', 'Reset password — PalladiumAI', 'Request a secure password reset link for your PalladiumAI account.'],
  ['reset-password', 'ResetPassword', '/reset-password', 'Choose a new password — PalladiumAI', 'Set a new password for your PalladiumAI account.'],
  ['two-factor', 'TwoFactor', '/two-factor', 'Two-factor verification — PalladiumAI', 'Confirm your identity with a second factor to protect your workspace.'],
  ['onboarding', 'Onboarding', '/onboarding', 'Welcome — PalladiumAI', 'Set up your workspace, pick departments and meet your AI workforce.'],
  ['email-verification', 'EmailVerification', '/email-verification', 'Verify your email — PalladiumAI', 'Confirm your email address to activate your PalladiumAI workspace.'],
];

// [file, screen, title, description]
const app = [
  ['dashboard', 'Dashboard', 'Dashboard', 'Your AI workforce at a glance: live missions, agents and outcomes.'],
  ['chat', 'Chat', 'Chat', 'Talk to your agents with full context, tools and memory.'],
  ['prompts', 'Prompts', 'Prompts', 'Version, test and share prompts across your workforce.'],
  ['models', 'Models', 'Models', 'Compare and route across frontier and open models.'],
  ['agents.index', 'Agents', 'Agents', 'Manage every agent in your organisation.'],
  ['agents.new', 'AgentWizard', 'New agent', 'Create a new specialised agent step by step.'],
  ['agent-builder', 'AgentBuilder', 'Agent builder', 'Design agent behaviour, tools and guardrails visually.'],
  ['agents.$id.index', 'AgentDetail', 'Agent detail', 'Inspect an agent’s configuration, tools and performance.'],
  ['agents.$id.playground', 'AgentPlayground', 'Agent playground', 'Test an agent live before deploying it to production.'],
  ['tasks', 'Tasks', 'Tasks', 'Track everything your AI workforce is working on.'],
  ['files-analysis', 'FileAnalysis', 'File analysis', 'Extract insight from documents, sheets and media.'],
  ['search', 'Research', 'Research', 'Deep research runs with citations and structured output.'],
  ['workforce', 'Workforce', 'Workforce', 'Your org chart of AI employees and their teams.'],
  ['builder', 'Builder', 'Builder', 'Compose apps and interfaces for your workforce.'],
  ['marketplace', 'Marketplace', 'Marketplace', 'Install capabilities, templates and integrations.'],
  ['agent-marketplace', 'AgentMarketplace', 'Agent marketplace', 'Hire pre-built agents from the community.'],
  ['creator-hub', 'CreatorHub', 'Creator hub', 'Publish and monetise agents you build.'],
  ['creators.$id', 'CreatorProfile', 'Creator profile', 'Browse a creator’s published agents and reviews.'],
  ['automation', 'AutomationStudio', 'Automation studio', 'Build multi-step automations with triggers and approvals.'],
  ['workflows', 'Workflows', 'Workflows', 'Orchestrate long-running processes across agents.'],
  ['skills', 'Skills', 'Skills', 'Reusable skills your agents can learn and apply.'],
  ['memory', 'Memory', 'Memory', 'Long-term organisational memory for your workforce.'],
  ['tools-framework', 'ToolsFramework', 'Tools framework', 'Define, test and permission the tools agents can call.'],
  ['knowledge', 'Knowledge', 'Knowledge', 'Curate the knowledge base your agents rely on.'],
  ['tool-marketplace', 'ToolMarketplace', 'Tool marketplace', 'Add new tools and connectors to your workspace.'],
  ['computer-control', 'ComputerControl', 'Computer control', 'Let agents operate a browser and desktop safely.'],
  ['ai-builder', 'AIAppBuilder', 'AI app builder', 'Generate internal apps from a prompt.'],
  ['developer-workspace', 'DeveloperWorkspace', 'Developer workspace', 'Code, run and ship with agent pair-programming.'],
  ['code-explorer', 'CodeExplorer', 'Code explorer', 'Navigate and understand any codebase with AI.'],
  ['terminal', 'Terminal', 'Terminal', 'A sandboxed terminal your agents can drive.'],
  ['browser-preview', 'BrowserPreview', 'Browser preview', 'Preview and test live web output.'],
  ['deployments', 'Deployments', 'Deployments', 'Ship and monitor releases from one place.'],
  ['developer-portal', 'DeveloperPortal', 'Developer portal', 'API keys, webhooks and platform docs.'],
  ['version-control', 'GitControl', 'Version control', 'Branches, reviews and commits with agent assistance.'],
  ['business-intelligence', 'BusinessIntelligence', 'Business intelligence', 'Ask questions of your data and get decisions.'],
  ['analytics', 'Analytics', 'Analytics', 'Outcome-level reporting for your AI workforce.'],
  ['business-automation', 'BusinessAutomation', 'Business automation', 'Automate back-office processes end to end.'],
  ['crm', 'CRM', 'CRM', 'Pipeline, contacts and AI-run follow-up.'],
  ['marketing', 'Marketing', 'Marketing', 'Campaigns, content and growth on autopilot.'],
  ['finance', 'Finance', 'Finance', 'Cashflow, invoices and forecasting with AI.'],
  ['support', 'CustomerSupport', 'Customer support', 'Resolve tickets with agents and human escalation.'],
  ['documents', 'Documents', 'Documents', 'Draft, review and store business documents.'],
  ['ai-marketplace', 'AIMarketplace', 'AI marketplace', 'Discover everything you can add to your OS.'],
  ['web', 'Web', 'Web', 'Browse and extract from the live web.'],
  ['discovery', 'AIDiscovery', 'Discovery', 'Discover new models, tools and agents.'],
  ['news-research', 'AINews', 'News & research', 'Stay current on AI with curated intelligence.'],
  ['ai-tools', 'AITools', 'AI tools', 'Your installed toolkit, ready for any agent.'],
  ['ai-model-hub', 'AIModelHub', 'Model hub', 'Manage model access, keys and routing.'],
  ['mcp-hub', 'McpHub', 'MCP hub', 'Connect MCP servers to your workforce.'],
  ['templates', 'Templates', 'Templates', 'Start from proven mission and agent templates.'],
  ['projects', 'Projects', 'Projects', 'Group work into projects with goals and owners.'],
  ['files', 'Files', 'Files', 'Every file your workforce creates or uses.'],
  ['integrations', 'Integrations', 'Integrations', 'Connect the tools your business already runs on.'],
  ['team', 'Team', 'Team', 'Invite humans and manage roles.'],
  ['security', 'Security', 'Security', 'Access, audit and data-protection controls.'],
  ['billing', 'Billing', 'Billing', 'Plan, usage and invoices.'],
  ['settings', 'Settings', 'Settings', 'Workspace preferences and system controls.'],
  ['notifications', 'Notifications', 'Notifications', 'Approvals and events from your workforce.'],
  ['admin.index', 'Admin', 'Admin', 'Platform administration overview.'],
  ['admin.users', 'AdminUsers', 'Admin · Users', 'Manage platform users and access.'],
  ['admin.organisations', 'AdminOrganisations', 'Admin · Organisations', 'Manage tenants and organisations.'],
  ['admin.subscriptions', 'AdminSubscriptions', 'Admin · Subscriptions', 'Plans, entitlements and renewals.'],
  ['admin.platform-analytics', 'AdminPlatformAnalytics', 'Admin · Platform analytics', 'Usage and growth across the platform.'],
  ['admin.security', 'AdminSecurity', 'Admin · Security', 'Security posture and policy enforcement.'],
  ['admin.audit-logs', 'AuditLogs', 'Admin · Audit logs', 'Every privileged action, recorded.'],
  ['admin.system-settings', 'AdminSystemSettings', 'Admin · System settings', 'Platform-wide configuration.'],
  ['admin.integrations', 'AdminIntegrations', 'Admin · Integrations', 'Global connector configuration.'],
  ['admin.monitoring', 'SystemMonitoring', 'Admin · Monitoring', 'Health, latency and incident signals.'],
  ['admin.marketplace', 'AdminMarketplaceReview', 'Admin · Marketplace review', 'Review and approve submitted agents.'],
];

const modules = [
  ['automations', 'Automations', 'Every automation running in your workspace.'],
  ['developer', 'Developer', 'Developer surface for your AI workforce.'],
  ['docs', 'Docs', 'Documentation for your workspace and agents.'],
];

const meta = (title, description) => `  head: () => ({
    meta: [
      { title: ${JSON.stringify(title)} },
      { name: "description", content: ${JSON.stringify(description)} },
      { property: "og:title", content: ${JSON.stringify(title)} },
      { property: "og:description", content: ${JSON.stringify(description)} },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
`;

const write = (file, body) => {
  fs.mkdirSync(`src/routes/${file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : ''}`, { recursive: true });
  fs.writeFileSync(`src/routes/${file}`, body);
};

for (const [file, screen, path, title, description] of [...pub, ...auth]) {
  write(`${file}.tsx`, `import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/${screen}";

export const Route = createFileRoute("${path}")({
${meta(title, description)}  component: Screen,
});
`);
}

for (const [file, screen, title, description] of app) {
  const routePath = '/_shell/_app/' + file.replace(/\./g, '/').replace(/\/index$/, '');
  write(`_shell/_app/${file}.tsx`, `import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/${screen}";

export const Route = createFileRoute("${routePath}")({
${meta(`${title} — PalladiumAI`, description)}  component: Screen,
});
`);
}

for (const [file, title, description] of modules) {
  write(`_shell/_app/${file}.tsx`, `import { createFileRoute } from "@tanstack/react-router";
import ModulePage from "@/screens/ModulePage";

export const Route = createFileRoute("/_shell/_app/${file}")({
${meta(`${title} — PalladiumAI`, description)}  component: () => <ModulePage type="${file}" />,
});
`);
}

write('legal.index.tsx', `import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/")({
  beforeLoad: () => {
    throw redirect({ to: "/legal/$slug", params: { slug: "terms-of-service" } });
  },
});
`);

write('legal.$slug.tsx', `import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/Legal";

export const Route = createFileRoute("/legal/$slug")({
${meta('Legal — PalladiumAI', 'Terms of service, privacy, security and AI safety policies for PalladiumAI.')}  component: Screen,
});
`);

write('_shell.tsx', `import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/_shell")({
  component: () => <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />,
});
`);

write('_shell/_app.tsx', `import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/palladium/AppShell";

export const Route = createFileRoute("/_shell/_app")({
  component: AppShell,
});
`);

console.log('routes written');
