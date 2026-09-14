import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const functions=readFileSync('src/lib/dropshipping/dropshipping-listings.functions.ts','utf8');
const executor=readFileSync('src/lib/mission/external-action-approval.functions.ts','utf8');
const screen=readFileSync('src/screens/DropshippingListingWorkbench.jsx','utf8');

describe('Dropshipping governed listing approval contract',()=>{
  it('binds provider execution to a real immutable Mission Control approval',()=>{
    expect(functions).toContain("action_type:'nango_dynamic_action'");
    expect(functions).toContain('provider:prepared.provider');
    expect(functions).toContain('action:prepared.action');
    expect(functions).toContain('input:prepared.input');
    expect(functions).toContain('transport:prepared.transport');
    expect(functions).toContain('draft_hash:hash');
    expect(executor).toContain('if (type === "nango_dynamic_action")');
    expect(executor).toContain('executeApprovedIntegrationAction(userId, details)');
    expect(executor).toContain('.eq("status", "pending")');
    expect(executor).toContain('execution_status: "executing"');
  });

  it('invalidates a pending approval before persisting revised listing copy',()=>{
    const expiry=functions.indexOf("status:'expired'");
    const save=functions.indexOf('withListingDraftMetadata');
    expect(expiry).toBeGreaterThan(-1);
    expect(save).toBeGreaterThan(expiry);
    expect(functions).toContain('The linked Dropshipping Hub listing draft was revised before approval.');
  });

  it('does not present external listing creation as direct unapproved publication',()=>{
    expect(screen).toContain('Mission Control must approve it before the provider write');
    expect(screen).toContain('Request Shopify draft creation');
    expect(screen).toContain('Request Etsy draft creation');
    expect(screen).toContain('Verify the created draft in the connected store before activating/publishing it.');
  });
});
