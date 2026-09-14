import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(new URL('../../../supabase/migrations/20260914225500_dropshipping_continuous_opportunity_monitor.sql',import.meta.url),'utf8');
const monitor=readFileSync(new URL('./dropshipping-monitor.server.ts',import.meta.url),'utf8');
const route=readFileSync(new URL('../../routes/api/internal/dropshipping-opportunity-monitor.ts',import.meta.url),'utf8');
const auth=readFileSync(new URL('../runtime/runtime-worker-auth.server.ts',import.meta.url),'utf8');

describe('Dropshipping continuous opportunity monitor',()=>{
  it('uses the existing hashed runtime-worker verifier and keeps the token in Vault',()=>{
    expect(migration).toContain("'dropshipping_monitor'");
    expect(migration).toContain('blackstar_dropshipping_monitor_token');
    expect(migration).toContain("extensions.digest(v_token, 'sha256')");
    expect(migration).toContain('vault.create_secret');
    expect(migration).not.toMatch(/Bearer [A-Za-z0-9_-]{32,}/);
    expect(auth).toContain('dropshipping_monitor: "DROPSHIPPING_MONITOR_CRON_SECRET"');
    expect(route).toContain("isValidRuntimeWorkerToken('dropshipping_monitor',supplied)");
  });

  it('schedules only the protected canonical production monitor endpoint',()=>{
    expect(migration).toContain("'blackstar-dropshipping-opportunity-monitor'");
    expect(migration).toContain("'7,37 * * * *'");
    expect(migration).toContain('https://palladium-ai-os.vercel.app/api/internal/dropshipping-opportunity-monitor?limit=4');
  });

  it('claims due rows, releases stale claims and retries failures without duplicating work',()=>{
    expect(monitor).toContain(".lt('claimed_at',staleClaim)");
    expect(monitor).toContain(".is('claimed_at',null)");
    expect(monitor).toContain('monitor_attempts:attempts');
    expect(monitor).toContain('retryMinutes');
    expect(monitor).toContain('claimed_at:null');
  });

  it('records evidence snapshots and updates only watchlist intelligence state',()=>{
    expect(monitor).toContain("from('dropshipping_opportunity_snapshots').insert");
    expect(monitor).toContain("from('dropshipping_opportunities').update");
    expect(monitor).toContain('searchPublicWeb');
    expect(monitor).toContain('runChat');
    expect(monitor).not.toMatch(/prepareIntegrationAction|executeIntegrationAction|approval_requests|retail_orders|retail_catalog_items/);
  });

  it('keeps automatic scoring bounded and alerts only on meaningful movement',()=>{
    expect(monitor).toContain("z.number().min(0).max(100)");
    expect(monitor).toContain('Math.abs(delta)>=10');
    expect(monitor).toContain('oldBand!==newBand');
    expect(monitor).toContain('complianceDelta>=20');
    expect(monitor).toContain("type:'dropshipping.opportunity_movement'");
  });
});
