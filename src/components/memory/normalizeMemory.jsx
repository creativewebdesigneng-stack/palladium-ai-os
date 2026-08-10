// Maps a backend AgentMemory record to the display shape used by MemoryCard.
import { MEMORY_TYPES, MEMORY_SCOPES } from './memoryData';

export function typeMeta(id) {
  return MEMORY_TYPES.find((t) => t.id === id) || MEMORY_TYPES[0];
}

export function scopeMeta(id) {
  return MEMORY_SCOPES.find((s) => s.id === id) || MEMORY_SCOPES[0];
}

function relTime(iso) {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function normalizeMemory(m, agents = []) {
  const agent = agents.find((a) => a.id === m.agent_id);
  return {
    id: m.id,
    memory_type: m.memory_type || 'short_term',
    category: m.category || 'conversation',
    scope: m.scope || 'private',
    title: m.title || '',
    content: m.content,
    source: m.source || '',
    importance: m.importance || 'medium',
    pinned: !!m.pinned,
    agent_id: m.agent_id || '',
    agent_name: agent ? agent.name : (m.scope === 'shared' ? 'Organisation' : m.scope === 'user' ? 'User memory' : 'Agent'),
    user_id: m.user_id || '',
    file_url: m.file_url || '',
    vector_status: m.vector_status || 'disabled',
    vector_provider: m.vector_provider || 'none',
    created: m.created_date,
    lastUsed: m.last_used_date || m.updated_date,
    _backend: true,
  };
}

export function createdLabel(iso) {
  return iso ? new Date(iso).toLocaleDateString() : '—';
}

export { relTime };