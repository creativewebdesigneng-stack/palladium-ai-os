import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const functions=readFileSync(new URL('./company-workspaces.functions.ts',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../../components/company/CompanyWorkspace.jsx',import.meta.url),'utf8');
const migration=readFileSync('supabase/migrations/20260913230409_company_command_intelligence.sql','utf8');

describe('Company workspace intelligence persistence',()=>{
  it('persists bounded KPI, decision, cadence and opportunity context',()=>{
    for(const field of ['kpis','decisions','leadership_cadence','opportunities']){
      expect(functions).toContain(field);
    }
    expect(functions).toContain(".eq('user_id',context.userId)");
    expect(functions).toContain("kpis:z.array(z.record(z.string(),z.unknown())).max(200)");
    expect(functions).toContain("decisions:z.array(z.record(z.string(),z.unknown())).max(200)");
    expect(functions).toContain("opportunities:z.array(z.record(z.string(),z.unknown())).max(200)");
  });

  it('restores the exact applied migration into repository history',()=>{
    for(const field of ['kpis','decisions','leadership_cadence','opportunities']) expect(migration).toContain(field);
    expect(migration).toContain('alter table public.company_workspaces');
  });

  it('exposes the persistent fields without creating another execution runtime',()=>{
    expect(workspace).toContain('Company KPIs');
    expect(workspace).toContain('Material decisions');
    expect(workspace).toContain('Leadership cadence / review notes');
    expect(workspace).toContain('Opportunities');
    expect(workspace).not.toContain('executeAgent');
    expect(workspace).toContain('const mergeObjectLines=');
    expect(workspace).toContain("ai_workforce_plan:mergeObjectLines(v,form.ai_workforce_plan,'role')");
    expect(workspace).toContain("kpis:mergeObjectLines(v,form.kpis,'name')");
    expect(workspace).toContain("decisions:mergeObjectLines(v,form.decisions,'decision')");
    expect(workspace).toContain("opportunities:mergeObjectLines(v,form.opportunities,'name')");
  });
});
