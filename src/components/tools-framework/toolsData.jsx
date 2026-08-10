// Frontend display mirror for the Tools & Integration Framework.
// The backend shared modules (toolRegistry.ts / toolPermissions.ts) are the
// real seam; this file only drives UI rendering so the page never imports
// server-side code.
import { Globe, FileText, BarChart3, Plug, Database, Code2, Eye, Pencil, Play, Wifi, FolderOpen, Box } from 'lucide-react';

export const TOOL_CATEGORIES = [
  { id: 'all', label: 'All', icon: Box },
  { id: 'web', label: 'Web', icon: Globe },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'data', label: 'Data', icon: BarChart3 },
  { id: 'api', label: 'APIs', icon: Plug },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'code', label: 'Code', icon: Code2 },
];

export const PERMISSION_META = {
  Read: { icon: Eye, color: 'text-sky-300' },
  Write: { icon: Pencil, color: 'text-amber-300' },
  Execute: { icon: Play, color: 'text-emerald-300' },
  Network: { icon: Wifi, color: 'text-violet-300' },
  Filesystem: { icon: FolderOpen, color: 'text-cyan-300' },
  Sandboxed: { icon: Box, color: 'text-zinc-300' },
};

export const PLAN_BADGE = {
  free: { label: 'Free', cls: 'bg-zinc-500/15 text-zinc-300' },
  pro: { label: 'Pro', cls: 'bg-violet-500/15 text-violet-300' },
  business: { label: 'Business', cls: 'bg-amber-500/15 text-amber-300' },
  enterprise: { label: 'Enterprise', cls: 'bg-fuchsia-500/15 text-fuchsia-300' },
};

export const INTEGRATIONS = [
  { key: 'google_workspace', name: 'Google Workspace', category: 'Productivity', description: 'Gmail, Calendar, Drive, Docs & Sheets.', auth_type: 'OAuth 2.0', scopes: ['mail.read', 'calendar', 'drive'], connector: 'googledrive', required_plan: 'pro', grad: 'from-sky-500 to-blue-500', initials: 'GW' },
  { key: 'microsoft_365', name: 'Microsoft 365', category: 'Productivity', description: 'Outlook, Teams, OneDrive & SharePoint.', auth_type: 'OAuth 2.0', scopes: ['mail.read', 'files', 'teams'], connector: 'outlook', required_plan: 'pro', grad: 'from-blue-500 to-indigo-500', initials: 'M3' },
  { key: 'slack', name: 'Slack', category: 'Communication', description: 'Channels, messages and notifications.', auth_type: 'OAuth 2.0', scopes: ['channels', 'chat:write'], connector: 'slack', required_plan: 'pro', grad: 'from-fuchsia-500 to-pink-500', initials: 'SL' },
  { key: 'discord', name: 'Discord', category: 'Communication', description: 'Servers, channels and direct messages.', auth_type: 'OAuth 2.0', scopes: ['guilds', 'messages'], connector: 'discord', required_plan: 'pro', grad: 'from-indigo-500 to-violet-500', initials: 'DC' },
  { key: 'crm', name: 'CRM Systems', category: 'Business', description: 'Salesforce, HubSpot & Zoho — contacts and deals sync.', auth_type: 'OAuth 2.0', scopes: ['contacts', 'deals'], connector: 'salesforce', required_plan: 'business', grad: 'from-amber-500 to-orange-500', initials: 'CR' },
  { key: 'project_management', name: 'Project Management', category: 'Business', description: 'Jira, ClickUp, Asana & Linear — tasks and projects.', auth_type: 'OAuth 2.0', scopes: ['tasks', 'projects'], connector: 'jira', required_plan: 'business', grad: 'from-emerald-500 to-teal-500', initials: 'PM' },
];

export const SECURITY_FIELDS = [
  { key: 'allowNetwork', label: 'Allow network tools', desc: 'Permit tools that make outbound HTTP requests (Web search, API calls).' },
  { key: 'allowCodeExecution', label: 'Allow code execution', desc: 'Permit tools that evaluate code in the sandbox.' },
  { key: 'allowFilesystem', label: 'Allow filesystem tools', desc: 'Permit tools that read and write files.' },
  { key: 'blockExternalApis', label: 'Block external APIs', desc: 'Restrict API calls to allowlisted endpoints only.' },
];