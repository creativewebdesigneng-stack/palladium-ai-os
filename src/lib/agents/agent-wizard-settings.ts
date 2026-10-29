import {AGENT_MODEL_CHOICES} from './agent-model-selection';
export type AgentToolChoice = {slug:string;name:string;description?:string;is_active:boolean;executable:boolean;min_plan?:string};
/** Translate UI choices without granting tool permission or connector access. */
export function agentWizardSettings(input:{model:string;mem:Record<string,boolean>;tools:string[];nativeModel?:string},catalogue:AgentToolChoice[]) {
  let selected = AGENT_MODEL_CHOICES[input.model];
  if (input.model === 'astra-native') {
    // Never persist the placeholder "local-model" or guess the model ID.
    // The server's configured provider overview supplies the active native model.
    const nativeModel = (input.nativeModel ?? '').trim();
    if (nativeModel === 'local-model' || nativeModel.length > 128 ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(nativeModel)) {
      throw new Error('Blackstar Astra local model is not configured.');
    }
    selected = { provider: 'compatible', model: nativeModel };
  }
  if (!selected) throw new Error('Select a supported AI model.');
  const allowed = new Set(catalogue.filter(t=>t.is_active&&t.executable).map(t=>t.slug));
  const tools=[...new Set(input.tools)];
  if(tools.length>30) throw new Error('Choose at most 30 tools for this agent.');
  if(tools.some(t=>!allowed.has(t))) throw new Error('A selected tool is unavailable. Refresh the tool catalogue and review your selection.');
  return {model:selected.model,model_provider:selected.provider,memory_enabled:Object.values(input.mem).some(v=>v===true),allowed_tools:tools};
}
