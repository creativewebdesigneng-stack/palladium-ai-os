import { describe, expect, it } from 'vitest';
import { AGENT_PROCEDURE_160, AGENT_PROCEDURE_CATEGORIES, validateAgentProcedure160 } from './agent-procedures-160';
import { AGENT_PROCEDURE_PLAYBOOKS_160 } from './agent-procedure-playbooks';
import { INTEGRATION_PLAYBOOKS } from './builtin-integration-playbooks';
import { prepareAgentSkillPackage } from './skill-package';
import { loadProgressiveSkillContext } from './skill-context.server';

describe('160 reusable Blackstar agent procedures', () => {
  it('contains exactly 160 original package identities across sixteen meaningful domains', () => {
    expect(validateAgentProcedure160()).toBe(true);
    expect(AGENT_PROCEDURE_PLAYBOOKS_160).toHaveLength(160);
    expect(AGENT_PROCEDURE_CATEGORIES).toHaveLength(16);
    expect(new Set(AGENT_PROCEDURE_160.map((item) => item.name)).size).toBe(160);
    expect(new Set(AGENT_PROCEDURE_160.map((item) => item.procedure)).size).toBe(160);
    const older = new Set(INTEGRATION_PLAYBOOKS.map((item) => item.name));
    expect(AGENT_PROCEDURE_160.every((item) => !older.has(item.name))).toBe(true);
    for (const category of AGENT_PROCEDURE_CATEGORIES) {
      expect(AGENT_PROCEDURE_160.filter((item) => item.category === category)).toHaveLength(10);
    }
  });

  it('scans every SKILL.md and never smuggles runtime authority or scripts into guidance', () => {
    for (const [index, item] of AGENT_PROCEDURE_PLAYBOOKS_160.entries()) {
      const def = AGENT_PROCEDURE_160[index]!;
      const prepared = prepareAgentSkillPackage([{ path: 'SKILL.md', content: item.body }]);
      expect(item.name).toBe(def.name);
      expect(item.sourceRef).toBe('blackstar-agent-procedures:v1:' + item.name);
      expect(prepared.scan.verdict).toBe('ok');
      expect(prepared.dangerous).toBe(false);
      expect(prepared.requiresTools).toEqual([]);
      expect(prepared.requiresScripts).toEqual([]);
      expect(prepared.requiresProviders).toEqual([]);
      expect(prepared.files).toEqual({ 'SKILL.md': item.body });
      expect(prepared.body).toContain(def.procedure);
      expect(prepared.body).toContain(def.verify);
      expect(prepared.body).toContain('Runtime boundaries');
    }
  });

  it('includes the end of the 160-skill catalogue in existing progressive discovery', async () => {
    const rows = AGENT_PROCEDURE_PLAYBOOKS_160.map((item, index) => {
      const prepared = prepareAgentSkillPackage([{ path: 'SKILL.md', content: item.body }]);
      return {
        id: 'procedure-' + index,
        name: prepared.name,
        description: prepared.description,
        version: prepared.version,
        requires_tools: prepared.requiresTools,
        requires_scripts: prepared.requiresScripts,
        dangerous: prepared.dangerous,
        body: prepared.body,
        enabled: true,
        scan_verdict: prepared.scan.verdict,
        files: prepared.files,
      };
    });
    let requestedLimit = 0;
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: async (limit: number) => {
        requestedLimit = limit;
        return { data: rows.slice(0, limit), error: null };
      },
    };
    const sb = { from: () => chain };
    const last = AGENT_PROCEDURE_PLAYBOOKS_160[159]!;
    const result = await loadProgressiveSkillContext({ sb, userId: 'test-user', input: last.name });
    expect(requestedLimit).toBeGreaterThanOrEqual(160);
    expect(result.index.some((skill) => skill.name === last.name)).toBe(true);
    expect(result.selected.some((skill) => skill.name === last.name && skill.body.length > 0)).toBe(true);
    expect(result.selected.length).toBeLessThanOrEqual(2);
  });

  it('rejects accidental catalogue duplication or missing procedure', () => {
    const first = AGENT_PROCEDURE_160[0]!;
    expect(validateAgentProcedure160([...AGENT_PROCEDURE_160.slice(0, 159), first])).toBe(false);
    expect(validateAgentProcedure160(AGENT_PROCEDURE_160.slice(0, 159))).toBe(false);
    expect(validateAgentProcedure160(AGENT_PROCEDURE_160.map((item, i) => i === 0 ? { ...item, procedure: '' } : item))).toBe(false);
  });
});
