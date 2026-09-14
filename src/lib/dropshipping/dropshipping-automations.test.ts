import {describe,expect,it} from 'vitest';
import {buildDropshippingAutomationDefinition,DROPSHIPPING_AUTOMATION_TEMPLATES} from './dropshipping-automations';

describe('Dropshipping automation pack',()=>{
  it('covers the core supervised operating loops',()=>{
    expect(DROPSHIPPING_AUTOMATION_TEMPLATES.map(row=>row.id)).toEqual([
      'product-opportunity-research',
      'supplier-stock-cost-watch',
      'listing-optimisation-review',
      'order-exception-response',
      'customer-support-triage',
    ]);
  });

  it('builds scheduled workflows around an owned agent',()=>{
    const definition=buildDropshippingAutomationDefinition({templateId:'supplier-stock-cost-watch',agentId:'agent-123',operationName:'North Star Goods'});
    expect(definition.trigger_type).toBe('schedule');
    expect(definition.schedule).toBe('0 */6 * * *');
    expect(definition.steps[0]).toMatchObject({kind:'agent',agent_id:'agent-123'});
    expect(definition.steps.some(step=>step.kind==='approval')).toBe(true);
    expect(definition.steps.at(-1)?.kind).toBe('notification');
    expect(definition.description).toMatch(/North Star Goods/);
  });

  it('keeps research read-only unless a later template explicitly requires approval',()=>{
    const definition=buildDropshippingAutomationDefinition({templateId:'product-opportunity-research',agentId:'agent-1'});
    expect(definition.steps.some(step=>step.kind==='approval')).toBe(false);
    expect(definition.steps[0].requires_approval).toBe(false);
  });

  it('fails closed when no agent is selected',()=>{
    expect(()=>buildDropshippingAutomationDefinition({templateId:'order-exception-response',agentId:''})).toThrow(/Choose a Blackstar agent/i);
  });
});
