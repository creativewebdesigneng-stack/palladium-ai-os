import { useState, useEffect, useCallback } from 'react';
import { Blocks, Globe, ScrollText, Plug } from 'lucide-react';
import { listIntegrations, startIntegrationOAuth, disconnectIntegration as disconnectIntegrationFn } from '@/lib/integrations/integrations.functions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useUpgrade } from '@/lib/upgradeContext';
import ToolsTab from '@/components/tools-framework/ToolsTab';
import IntegrationsTab from '@/components/tools-framework/IntegrationsTab';
import BrowserPolicyPanel, { ExecutionLog } from '@/components/tools-framework/BrowserPolicyPanel';
import { getToolFramework, saveToolPermission, runToolManually } from '@/lib/tools/tools.functions';

const TABS = [
  { id: 'tools', label: 'Tools', icon: Blocks },
  { id: 'policy', label: 'Browser & domains', icon: Globe },
  { id: 'executions', label: 'Execution log', icon: ScrollText },
  { id: 'integrations', label: 'Integrations', icon: Plug },
];

const PLAN_LABEL = { explorer: 'free', builder: 'pro', business: 'business', enterprise: 'enterprise' };

const PERMS = {
  research: ['Read', 'Network'],
  automation: ['Execute', 'Network'],
  api: ['Network'],
  knowledge: ['Read'],
  data: ['Read'],
  database: ['Read'],
  development: ['Execute', 'Sandboxed'],
  commerce: ['Network', 'Execute'],
  communication: ['Write', 'Network'],
  productivity: ['Read', 'Write'],
  finance: ['Read'],
};

function toCard(row) {
  return {
    ...row,
    id: row.slug,
    key: row.slug,
    enabled: row.permission ? row.permission.enabled !== false : row.executable,
    required_plan: PLAN_LABEL[row.min_plan] || 'free',
    permissions: PERMS[row.category] || ['Read'],
    auth_method: row.kind === 'builtin' ? 'Built-in' : row.kind,
    input_schema: row.config_schema,
  };
}

export default function ToolsFramework() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { gate } = useUpgrade();
  const [tab, setTab] = useState('tools');
  const [framework, setFramework] = useState({ tools: [], executions: [], agents: [], browser: null, plan: 'explorer' });
  const [integrationCatalogue, setIntegrationCatalogue] = useState([]);
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.data?.org_role === 'admin' || user?.data?.org_role === 'owner' || user?.data?.is_owner;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getToolFramework({ data: {} });
      setFramework(data);
      setAgentId((prev) => prev || data.agents?.[0]?.id || '');
      try {
        const integRes = await listIntegrations({ data: {} });
        setIntegrationCatalogue(integRes.catalogue || []);
      } catch { /* integrations are optional */ }
    } catch (e) {
      toast({ title: 'Failed to load framework', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const tools = framework.tools.map(toCard);

  const runTool = async (tool, inputStr) => {
    const planGate = tool.required_plan === 'free' ? true : tool.required_plan === 'pro' ? gate('runTasks') : gate('advancedTools');
    if (!planGate) throw new Error('Upgrade required');
    if (!agentId) throw new Error('Create an agent first — tools always run on behalf of an agent.');
    let parsed = {};
    try { parsed = inputStr.trim() ? JSON.parse(inputStr) : {}; } catch { parsed = { query: inputStr, requirement: inputStr, url: inputStr }; }
    const res = await runToolManually({ data: { agentId, tool: tool.slug, input: parsed } });
    load();
    if (res.status === 'awaiting_approval') return { status: 'awaiting_approval', approval_request_id: res.approvalRequestId };
    const output = res.outputJson ? JSON.parse(res.outputJson) : null;
    if (res.status === 'failed') throw new Error(output?.error || 'Tool run failed');
    return output;
  };

  const persist = async (payload, successTitle) => {
    setSaving(true);
    try {
      await saveToolPermission({ data: payload });
      toast({ title: successTitle });
      await load();
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = (tool, enabled) =>
    persist(
      {
        tool: tool.slug,
        enabled,
        requiresApproval: Boolean(tool.permission?.requires_approval ?? tool.requires_approval),
        allowedDomains: tool.permission?.allowed_domains || [],
        spendCap: tool.permission?.spend_cap ?? null,
      },
      `${tool.name} ${enabled ? 'enabled' : 'disabled'}`,
    );

  const connectIntegration = async (def) => {
    try {
      const { authorizeUrl } = await startIntegrationOAuth({ data: { provider: def.id, origin: window.location.origin } });
      window.location.href = authorizeUrl;
    } catch (e) { toast({ title: 'Connection failed', description: e.message, variant: 'destructive' }); }
  };
  const disconnectIntegration = async (def) => {
    try {
      await disconnectIntegrationFn({ data: { provider: def.id } });
      toast({ title: `${def.name} disconnected` });
      load();
    } catch (e) { toast({ title: 'Disconnect failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl px-3.5 py-2 text-sm ${tab === t.id ? 'bg-white text-black' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>{t.label}</button>
          ))}
        </div>
        {framework.agents.length > 0 && (
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            Run as
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none">
              {framework.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {tab === 'tools' && <ToolsTab tools={tools} loading={loading} isAdmin={isAdmin} onRunTool={runTool} onToggleTool={toggleTool} />}
      {tab === 'policy' && <BrowserPolicyPanel tools={framework.tools} browser={framework.browser} saving={saving} onSave={(p) => persist(p, 'Policy updated')} />}
      {tab === 'executions' && <ExecutionLog executions={framework.executions} loading={loading} />}
      {tab === 'integrations' && <IntegrationsTab catalogue={integrationCatalogue} loading={loading} isAdmin={isAdmin} onConnect={connectIntegration} onDisconnect={disconnectIntegration} />}
    </div>
  );
}
