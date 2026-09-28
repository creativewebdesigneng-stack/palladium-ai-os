import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const workspace=readFileSync(new URL('../../components/company/CompanyWorkspace.jsx',import.meta.url),'utf8');
const server=readFileSync(new URL('./company-workspaces.functions.ts',import.meta.url),'utf8');

describe('Company command intelligence context',()=>{
  it('reuses the existing company workspace persistence instead of adding a duplicate system',()=>{
    expect(workspace).toContain('department_plan?.command_intelligence');
    expect(workspace).toContain("setCommand('kpis'");
    expect(workspace).toContain("setCommand('decisions'");
    expect(workspace).toContain("setCommand('opportunities'");
    expect(workspace).toContain("setCommand('leadership_cadence'");
    expect(server).toContain('department_plan:z.record');
    expect(server).toContain('department_plan:data.department_plan');
  });

  it('labels the recovered data as planning context rather than live telemetry',()=>{
    expect(workspace).toContain('Persistent planning context only');
    expect(workspace).toContain('Live/audited metrics remain sourced from Finance, CRM, BI and specialist systems.');
  });

  it('keeps bounded list input sizes',()=>{
    expect(workspace).toContain('.slice(0,50)');
  });
});
