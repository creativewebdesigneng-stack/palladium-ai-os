import { describe, expect, it } from 'vitest';
import { HUMAN_FRONTIER_TOOLS, validateHumanFrontierTools } from './registry';

describe('Human Frontier user-led tools', () => {
  it('offers exactly twenty distinct usable manual workflows', () => {
    expect(validateHumanFrontierTools()).toBe(true);
    expect(HUMAN_FRONTIER_TOOLS).toHaveLength(20);
    expect(new Set(HUMAN_FRONTIER_TOOLS.map((tool) => tool.name)).size).toBe(20);
    for (const tool of HUMAN_FRONTIER_TOOLS) {
      expect(tool.fields).toHaveLength(3);
      expect(tool.checks).toHaveLength(3);
      expect(tool.humanAction.length).toBeGreaterThan(30);
      expect(tool.output.length).toBeGreaterThan(10);
    }
  });

  it('rejects duplicate ids and missing human-workflow steps', () => {
    const one = HUMAN_FRONTIER_TOOLS[0]!;
    expect(validateHumanFrontierTools([...HUMAN_FRONTIER_TOOLS.slice(0, 19), one])).toBe(false);
    expect(validateHumanFrontierTools(HUMAN_FRONTIER_TOOLS.slice(0, 19))).toBe(false);
    expect(validateHumanFrontierTools(HUMAN_FRONTIER_TOOLS.map((tool, index) =>
      index === 0 ? { ...tool, checks: ['', tool.checks[1]!, tool.checks[2]!] as [string, string, string] } : tool,
    ))).toBe(false);
  });

  it('does not register these human workflows as executable agent tools', () => {
    for (const tool of HUMAN_FRONTIER_TOOLS) {
      expect('handler' in tool).toBe(false);
      expect('agentAction' in tool).toBe(false);
      expect('provider' in tool).toBe(false);
    }
  });
});
