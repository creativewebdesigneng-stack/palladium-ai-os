import {describe,expect,it} from 'vitest';
import {AGENT_MODEL_CHOICES,normaliseAgentModelSelection} from '../agent-model-selection';
describe('persisted wizard model selection',()=>{
  it('recovers the observed legacy OpenAI/Gemini display-label mismatch',()=>expect(normaliseAgentModelSelection('openai','Gemini')).toEqual({provider:'gemini',model:'gemini-2.5-flash'}));
  it.each(Object.entries(AGENT_MODEL_CHOICES))('persists a canonical pair for %s',(_id,pair)=>expect(normaliseAgentModelSelection(pair.provider,pair.model)).toEqual(pair));
  it('rejects cross-vendor canonical model IDs before a run is queued',()=>expect(()=>normaliseAgentModelSelection('openai','gemini-2.5-flash')).toThrow('does not match'));
  it('preserves explicitly configured compatible and gateway model namespaces',()=>{
    expect(normaliseAgentModelSelection('compatible','org/custom-model')).toEqual({provider:'compatible',model:'org/custom-model'});
    expect(normaliseAgentModelSelection('lovable','google/gemini-test')).toEqual({provider:'lovable',model:'google/gemini-test'});
  });
  it('does not silently redirect an unknown explicit provider',()=>expect(()=>normaliseAgentModelSelection('unknown','model')).toThrow('Unknown'));
});
