import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const functions=readFileSync(new URL('./company-workspaces.functions.ts',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../../components/company/CompanyWorkspace.jsx',import.meta.url),'utf8');

describe('Company workspace intelligence persistence',()=>{
  it('persists bounded KPI, decision, cadence and opportunity context',()=>{
    for(const field of ['kpis','decisions','leadership_cadence','opportunities']){
      expect(functions).toContain(field);
    }
    expect(functions).toContain(".eq('user_id',context.userId)");
  });

  it('exposes the persistent fields without creating another execution runtime',()=>{
    expect(workspace).toContain('Company KPIs');
    expect(workspace).toContain('Material decisions');
    expect(workspace).toContain('Leadership cadence / review notes');
    expect(workspace).toContain('Opportunities');
    expect(workspace).not.toContain('executeAgent');
  });
});
