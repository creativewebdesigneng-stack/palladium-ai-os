import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const functions=readFileSync(new URL('./dropshipping-listings.functions.ts',import.meta.url),'utf8');

describe('Dropshipping listing approval revision safety',()=>{
  it('expires pending publication approvals before persisting revised copy',()=>{
    const expiry=functions.indexOf("status:'expired'");
    const save=functions.indexOf('const nextMetadata=withListingDraftMetadata');
    expect(expiry).toBeGreaterThan(-1);
    expect(save).toBeGreaterThan(expiry);
    expect(functions).toContain('The linked Dropshipping Hub listing draft was revised before approval.');
  });

  it('scopes invalidation to the authenticated product, workspace and channel',()=>{
    expect(functions).toContain(".eq('user_id',context.userId)");
    expect(functions).toContain(".eq('action_type','nango_dynamic_action')");
    expect(functions).toContain(".eq('status','pending')");
    expect(functions).toContain(".eq('details->>dropshipping_item_id',item.id)");
    expect(functions).toContain(".eq('details->>dropshipping_workspace_id',item.workspace_id)");
    expect(functions).toContain(".eq('details->>dropshipping_channel',data.channel)");
  });

  it('fails closed when stale approval invalidation cannot be completed',()=>{
    expect(functions).toContain('if(expiry.error)throw new Error');
  });
});
