import { describe, expect, it } from 'vitest';
import { prepareAgentSkillPackage } from './skill-package';
import { INTEGRATION_PLAYBOOKS } from './builtin-integration-playbooks';

describe('audited integration playbooks', () => {
  it('keeps every built-in identity unique', () => {
    expect(new Set(INTEGRATION_PLAYBOOKS.map((item) => item.name)).size).toBe(INTEGRATION_PLAYBOOKS.length);
    expect(new Set(INTEGRATION_PLAYBOOKS.map((item) => item.sourceRef)).size).toBe(INTEGRATION_PLAYBOOKS.length);
    expect(INTEGRATION_PLAYBOOKS.length).toBeGreaterThanOrEqual(19);
  });

  it('passes every built-in through the existing skill package scanner', () => {
    for (const item of INTEGRATION_PLAYBOOKS) {
      const prepared = prepareAgentSkillPackage([{ path: 'SKILL.md', content: item.body }]);
      expect(prepared.name).toBe(item.name);
      expect(prepared.scan.verdict).not.toBe('dangerous');
      expect(prepared.requiresScripts).toEqual([]);
    }
  });

  it('does not embed credential material or executable package files', () => {
    for (const item of INTEGRATION_PLAYBOOKS) {
      expect(item.body).not.toMatch(/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i);
      expect(item.body).not.toMatch(/(?:api[_-]?key|password|secret)\s*[:=]\s*[^\s<]+/i);
      expect(item.sourceRef).toMatch(/^(taste-skill|ornith-1|raven|superplane|scout):/);
    }
  });
});
