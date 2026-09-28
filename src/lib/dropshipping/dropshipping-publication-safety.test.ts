import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const functions=readFileSync(new URL('./dropshipping-listings.functions.ts',import.meta.url),'utf8');
const screen=readFileSync(new URL('../../screens/DropshippingListingWorkbench.jsx',import.meta.url),'utf8');

describe('Dropshipping publication safety contract',()=>{
  it('enforces product readiness before preparing any external provider action',()=>{
    const readiness=functions.indexOf('assertDropshippingPublicationReady(item,data.channel as DropshipChannel)');
    const prepare=functions.indexOf('const prepared=await prepareIntegrationAction');
    expect(readiness).toBeGreaterThan(-1);
    expect(prepare).toBeGreaterThan(readiness);
  });

  it('filters discovery and execution to bounded listing write actions',()=>{
    expect(functions).toContain('isDropshippingListingWriteAction(capability.action)');
    expect(functions).toContain('isDropshippingListingWriteAction(prepared.action)');
    expect(functions).toContain('not a bounded listing/product/offer write');
  });

  it('keeps the client advisory while leaving the server authoritative',()=>{
    expect(screen).toContain('assessDropshippingPublicationReadiness(selected,channel)');
    expect(screen).toContain('publicationReadiness.blockers');
    expect(screen).toContain('!publicationReadiness?.ready');
    expect(screen).toContain('Mission Control');
  });
});
