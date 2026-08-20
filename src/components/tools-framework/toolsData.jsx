// Presentation-only maps for the Tools Framework. Tool and integration domain
// data comes from authenticated server functions; this file contains no provider
// catalogue or connection state.
import { Globe, FileText, BarChart3, Plug, Database, Code2, Eye, Pencil, Play, Wifi, FolderOpen, Box } from 'lucide-react';

export const TOOL_CATEGORIES = [
  { id: 'all', label: 'All', icon: Box },
  { id: 'research', label: 'Research', icon: Globe },
  { id: 'automation', label: 'Automation', icon: Wifi },
  { id: 'api', label: 'APIs', icon: Plug },
  { id: 'knowledge', label: 'Knowledge', icon: FileText },
  { id: 'data', label: 'Data', icon: BarChart3 },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'development', label: 'Code', icon: Code2 },
  { id: 'commerce', label: 'Commerce', icon: Box },
  { id: 'communication', label: 'Comms', icon: Wifi },
  { id: 'productivity', label: 'Productivity', icon: FolderOpen },
];

export const PERMISSION_META = {
  Read: { icon: Eye, color: 'text-sky-300' },
  Write: { icon: Pencil, color: 'text-amber-300' },
  Execute: { icon: Play, color: 'text-emerald-300' },
  Network: { icon: Wifi, color: 'text-violet-300' },
  Filesystem: { icon: FolderOpen, color: 'text-cyan-300' },
  Sandboxed: { icon: Box, color: 'text-zinc-300' },
};

export const SECURITY_FIELDS = [
  { key: 'allowNetwork', label: 'Allow network tools', desc: 'Permit tools that make outbound HTTP requests (Web search, API calls).' },
  { key: 'allowCodeExecution', label: 'Allow code execution', desc: 'Permit tools that evaluate code in the sandbox.' },
  { key: 'allowFilesystem', label: 'Allow filesystem tools', desc: 'Permit tools that read and write files.' },
  { key: 'blockExternalApis', label: 'Block external APIs', desc: 'Restrict API calls to allowlisted endpoints only.' },
];
