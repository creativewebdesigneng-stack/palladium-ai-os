import { describe, expect, it } from 'vitest';
import { adaptLangflowWorkflowDefinition, isLangflowWorkflowDefinition } from './langflow-interoperability';

describe('Langflow interoperability', () => {
  it('detects and translates a basic Langflow graph into a PalladiumAI draft definition', () => {
    const source = {
      name: 'Support flow',
      description: 'Imported visual flow',
      data: {
        nodes: [
          { id: 'input', data: { type: 'ChatInput', display_name: 'Chat input' } },
          { id: 'agent', data: { type: 'Agent', display_name: 'Support agent', node: { template: { model: 'provider-model', api_key: 'must-not-cross' } } } },
          { id: 'output', data: { type: 'ChatOutput', display_name: 'Chat output' } },
        ],
        edges: [
          { source: 'input', target: 'agent' },
          { source: 'agent', target: 'output' },
        ],
      },
    };

    expect(isLangflowWorkflowDefinition(source)).toBe(true);
    const result = adaptLangflowWorkflowDefinition(source) as any;
    expect(result.name).toBe('Support flow');
    expect(result.trigger_type).toBe('manual');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].kind).toBe('agent');
    expect(result.steps[0].config.source).toBe('langflow-import');
    expect(result.steps[0].config.template.api_key).toBeUndefined();
    expect(result.steps[1].kind).toBe('notification');
  });

  it('leaves native PalladiumAI definitions unchanged', () => {
    const native = { name: 'Native', steps: [{ kind: 'agent' }] };
    expect(isLangflowWorkflowDefinition(native)).toBe(false);
    expect(adaptLangflowWorkflowDefinition(native)).toBe(native);
  });

  it('rejects graphs with no executable components', () => {
    const source = { name: 'Inputs only', data: { nodes: [{ id: 'a', data: { type: 'ChatInput' } }], edges: [] } };
    expect(() => adaptLangflowWorkflowDefinition(source)).toThrow(/no executable components/i);
  });
});
