import { useState, useEffect, useCallback } from 'react';
import { Blocks } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useUpgrade } from '@/lib/upgradeContext';
import ToolsTab from '@/components/tools-framework/ToolsTab';
import IntegrationsTab from '@/components/tools-framework/IntegrationsTab';
import SecurityPanel from '@/components/tools-framework/SecurityPanel';

const TABS = [
  { id: 'tools', label: 'Tools', icon: Blocks },
  { id: 'integrations', label: 'Integrations', icon: Blocks },
  { id: 'security', label: 'Security', icon: Blocks },
];

export default function ToolsFramework() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { gate } = useUpgrade();
  const [tab, setTab] = useState('tools');
  const [tools, setTools] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [security, setSecurity] = useState({});
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.data?.org_role === 'admin' || user?.data?.org_role === 'owner' || user?.data?.is_owner;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsRes, integRes] = await Promise.all([
        base44.functions.invoke('getTools', {}),
        base44.functions.invoke('manageIntegration', { action: 'list' }),
      ]);
      setTools(toolsRes.data?.tools || []);
      setIntegrations(integRes.data?.integrations || []);
      setSecurity(toolsRes.data?.security || {});
    } catch (e) {
      toast({ title: 'Failed to load framework', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const runTool = async (tool, inputStr) => {
    // Plan pre-check using the upgrade gate so free users get the modal.
    const planGate = tool.required_plan === 'free' ? true
      : tool.required_plan === 'pro' ? gate('runTasks')
      : gate('advancedTools');
    if (!planGate) throw new Error('Upgrade required');
    let parsed = {};
    try { parsed = inputStr.trim() ? JSON.parse(inputStr) : {}; } catch { parsed = { text: inputStr }; }
    const res = await base44.functions.invoke('runTool', { tool_id: tool.id, input: parsed });
    if (res.status === 403 && res.data?.upgrade_required) { gate('runTasks'); throw new Error(res.data?.error || 'Upgrade required'); }
    if (res.status >= 400) throw new Error(res.data?.error || 'Tool run failed');
    return res.data?.result;
  };

  const toggleTool = async (tool, enabled) => {
    try {
      await base44.functions.invoke('toggleTool', { tool_id: tool.id, enabled });
      setTools((ts) => ts.map((t) => t.id === tool.id ? { ...t, enabled } : t));
      toast({ title: `${tool.name} ${enabled ? 'enabled' : 'disabled'}` });
    } catch (e) { toast({ title: 'Action failed', description: e.message, variant: 'destructive' }); }
  };

  const connectIntegration = async (def) => {
    try {
      await base44.functions.invoke('manageIntegration', { action: 'connect', key: def.key });
      toast({ title: `${def.name} connected`, description: 'Add API credentials in settings to enable live sync.' });
      load();
    } catch (e) { toast({ title: 'Connection failed', description: e.message, variant: 'destructive' }); }
  };
  const disconnectIntegration = async (def) => {
    try {
      await base44.functions.invoke('manageIntegration', { action: 'disconnect', key: def.key });
      toast({ title: `${def.name} disconnected` });
      load();
    } catch (e) { toast({ title: 'Disconnect failed', description: e.message, variant: 'destructive' }); }
  };

  const saveSecurity = async (next) => {
    try {
      const res = await base44.functions.invoke('toggleTool', { security: next });
      setSecurity(res.data?.security || next);
      toast({ title: 'Security policy updated' });
    } catch (e) { toast({ title: 'Save failed', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="mb-5 flex gap-1.5">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl px-3.5 py-2 text-sm ${tab === t.id ? 'bg-white text-black' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'tools' && <ToolsTab tools={tools} loading={loading} isAdmin={isAdmin} onRunTool={runTool} onToggleTool={toggleTool} />}
      {tab === 'integrations' && <IntegrationsTab connections={integrations} loading={loading} isAdmin={isAdmin} onConnect={connectIntegration} onDisconnect={disconnectIntegration} />}
      {tab === 'security' && <SecurityPanel security={security} loading={loading} isAdmin={isAdmin} onSave={saveSecurity} />}
    </div>
  );
}