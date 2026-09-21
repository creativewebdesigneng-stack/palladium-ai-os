import { describe, expect, it, vi } from 'vitest';
import { composeSelectedCallObjective } from './call-context';
import { resolveSelectedCallContext } from './call-context.server';
import { startAiCallSchema } from './contracts';

const project = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 'owner-1',
  org_id: null,
  name: 'Production launch',
  description: 'Confirm green checks and real deployment',
  status: 'active',
  priority: 'high',
  due_at: null,
  tags: ['release'],
};
const company = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: 'owner-1',
  name: 'Owner company',
  industry: 'Software',
  mission: 'Help customers',
  priorities: ['Improve support'],
};
const recipientId = '33333333-3333-4333-8333-333333333333';

function scopedDb(records: Record<string, Array<Record<string, unknown>>>) {
  const from = vi.fn((table: string) => {
    const filters = new Map<string, unknown>();
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((key: string, value: unknown) => { filters.set(key, value); return chain; }),
      is: vi.fn((key: string, value: unknown) => { filters.set(key, value); return chain; }),
      maybeSingle: vi.fn(async () => ({
        data: (records[table] ?? []).find((row) =>
          [...filters].every(([key, value]) => row[key] === value)) ?? null,
        error: null,
      })),
    };
    return chain;
  });
  return { from };
}

describe('opt-in project and company grounding for AI calls', () => {
  it('leaves unselected calls unchanged without reading private records', async () => {
    const sb = scopedDb({ projects: [project], company_workspaces: [company] });
    const result = await resolveSelectedCallContext({ sb, userId: 'owner-1', objective: 'Safe operator update' });
    expect(result).toEqual({ objective: 'Safe operator update', projectId: null, companyWorkspaceId: null });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('loads only explicitly selected owned personal project and company on the server', async () => {
    const sb = scopedDb({ projects: [project], company_workspaces: [company] });
    const result = await resolveSelectedCallContext({ sb, userId: 'owner-1',
      objective: 'Give me an update', projectId: project.id, companyWorkspaceId: company.id });
    expect(result.projectId).toBe(project.id);
    expect(result.companyWorkspaceId).toBe(company.id);
    expect(result.objective).toContain('Selected owned project: Production launch');
    expect(result.objective).toContain('Selected owned company workspace: Owner company');
    expect(result.objective).toContain('unverified reference only');
    expect(result.objective.length).toBeLessThanOrEqual(2000);
    expect(sb.from).toHaveBeenCalledWith('projects');
    expect(sb.from).toHaveBeenCalledWith('company_workspaces');
  });

  it('rejects foreign-owned and organisation project selections', async () => {
    const db = scopedDb({ projects: [
      { ...project, user_id: 'owner-2' },
      { ...project, org_id: 'org-1' },
    ] });
    await expect(resolveSelectedCallContext({
      sb: db, userId: 'owner-1', objective: 'Call', projectId: project.id,
    })).rejects.toThrow('access was denied');
    const foreignCompany = scopedDb({ company_workspaces: [{ ...company, user_id: 'owner-2' }] });
    await expect(resolveSelectedCallContext({
      sb: foreignCompany, userId: 'owner-1', objective: 'Call', companyWorkspaceId: company.id,
    })).rejects.toThrow('access was denied');
  });

  it('never includes arbitrary notes, risks, credentials, or unrelated record fields', () => {
    const objective = composeSelectedCallObjective({
      objective: 'Project review',
      project: { ...project, description: 'note '.repeat(300), private_notes: 'DO NOT INCLUDE' } as typeof project,
      company: { ...company, notes: 'SENSITIVE UNSELECTED NOTES', risks: ['Sensitive risks'] } as typeof company,
    });
    expect(objective).not.toContain('DO NOT INCLUDE');
    expect(objective).not.toContain('SENSITIVE UNSELECTED NOTES');
    expect(objective).not.toContain('Sensitive risks');
    expect(objective.length).toBeLessThanOrEqual(2000);
    expect(objective).toContain('USER-SELECTED BLACKSTAR CONTEXT');
  });

  it('bounds selected context without truncating the stated call objective', () => {
    const objective = 'a'.repeat(1680);
    const output = composeSelectedCallObjective({ objective, project });
    expect(output.startsWith(objective)).toBe(true);
    expect(output.length).toBeLessThanOrEqual(2000);
    expect(() => composeSelectedCallObjective({ objective: 'x'.repeat(1990), project })).toThrow('Shorten');
  });

  it('accepts selected UUIDs but rejects unstructured browser payloads and invalid IDs', () => {
    const base = { recipient_id: recipientId, purpose: 'project_update', objective: 'An update' };
    expect(startAiCallSchema.parse(base)).toMatchObject(base);
    expect(startAiCallSchema.parse({ ...base, project_id: project.id, company_workspace_id: company.id })).toMatchObject({
      project_id: project.id, company_workspace_id: company.id,
    });
    expect(startAiCallSchema.safeParse({ ...base, project_id: 'not-an-id' }).success).toBe(false);
    expect(startAiCallSchema.safeParse({ ...base, company_context: 'client invented confidential content' }).success).toBe(true);
    // Zod strips unrecognised client-provided context and cannot use it.
    expect(startAiCallSchema.parse({ ...base, company_context: 'client invented confidential content' })).not.toHaveProperty('company_context');
  });
});
