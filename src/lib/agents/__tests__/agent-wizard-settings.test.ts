import {describe,expect,it} from 'vitest';
import {agentWizardSettings} from '../agent-wizard-settings';
const tools=[{slug:'web_search',name:'Search',is_active:true,executable:true},{slug:'file_analysis',name:'Files',is_active:true,executable:true},{slug:'retired',name:'Retired',is_active:false,executable:true},{slug:'placeholder',name:'Placeholder',is_active:true,executable:false}];
const input={model:'gemini',mem:{long:false,short:false,history:false,kb:false},tools:[] as string[]};
describe('wizard settings sent to the existing agent writer',()=>{
  it('preserves a no-tools, memory-off Gemini configuration',()=>expect(agentWizardSettings(input,tools)).toEqual({model:'gemini-2.5-flash',model_provider:'gemini',memory_enabled:false,allowed_tools:[]}));
  it('enables memory only for an explicitly selected memory option',()=>expect(agentWizardSettings({...input,mem:{long:true}},tools).memory_enabled).toBe(true));
  it('persists executable slugs and removes duplicate selections',()=>expect(agentWizardSettings({...input,tools:['file_analysis','web_search','web_search']},tools).allowed_tools).toEqual(['file_analysis','web_search']));
  it.each(['web','files','retired','placeholder','unregistered'])('rejects unavailable or display-only tool %s',slug=>expect(()=>agentWizardSettings({...input,tools:[slug]},tools)).toThrow('unavailable'));
  it('rejects a selection above the writer limit instead of silently dropping tools',()=>expect(()=>agentWizardSettings({...input,tools:Array.from({length:31},(_,i)=>'tool-'+i)},[])).toThrow('at most 30'));
  it('does not grant a tool when the catalogue is unavailable',()=>expect(()=>agentWizardSettings({...input,tools:['web_search']},[])).toThrow('unavailable'));
  it('allows deliberate no-tool setup without fabricating catalogue entries',()=>expect(agentWizardSettings(input,[]).allowed_tools).toEqual([]));
});
