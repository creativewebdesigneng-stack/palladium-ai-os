import { describe, expect, it } from 'vitest';
import { AI_WORKBENCH_CATEGORIES, AI_WORKBENCH_TOOLS, validateAiWorkbenchTools } from './catalogue';
import { buildAiWorkbenchMessage } from './prompt';

describe('AI Workbench live text tools', () => {
  it('contains exactly 160 distinct AI-invoked tools in 16 categories', () => {
    expect(validateAiWorkbenchTools()).toBe(true);
    expect(AI_WORKBENCH_CATEGORIES).toHaveLength(16);
    expect(AI_WORKBENCH_TOOLS).toHaveLength(160);
    expect(new Set(AI_WORKBENCH_TOOLS.map((tool) => tool.id)).size).toBe(160);
    expect(new Set(AI_WORKBENCH_TOOLS.map((tool) => tool.name)).size).toBe(160);
    for (const category of AI_WORKBENCH_CATEGORIES) {
      expect(AI_WORKBENCH_TOOLS.filter((tool) => tool.category === category)).toHaveLength(10);
    }
  });

  it('requires actionable distinct instructions and reviewable outputs for every tool', () => {
    for (const tool of AI_WORKBENCH_TOOLS) {
      expect(tool.instruction.length).toBeGreaterThan(55);
      expect(tool.deliverable.length).toBeGreaterThan(30);
      const prompt = buildAiWorkbenchMessage(tool, 'User-provided task context.');
      expect(prompt).toContain('Task: ' + tool.name);
      expect(prompt).toContain(tool.instruction);
      expect(prompt).toContain(tool.deliverable);
      expect(prompt).toContain('not taking an action');
      expect(prompt).toContain('USER-SUPPLIED SOURCE MATERIAL:');
      expect(prompt.length).toBeLessThanOrEqual(4000);
      expect('handler' in tool).toBe(false);
      expect('providerAction' in tool).toBe(false);
    }
  });

  it('refuses blank and oversized input before an AI request', () => {
    const tool = AI_WORKBENCH_TOOLS[0]!;
    expect(() => buildAiWorkbenchMessage(tool, '   ')).toThrow('Enter source material');
    expect(() => buildAiWorkbenchMessage(tool, 'x'.repeat(2401))).toThrow('2,400');
    expect(() => buildAiWorkbenchMessage(tool, 'Task', 'y'.repeat(351))).toThrow('350');
    expect(buildAiWorkbenchMessage(tool, 'Task', 'Keep it concise.')).toContain('Keep it concise.');
  });

  it('detects accidental duplicate IDs and incomplete instructions', () => {
    const first = AI_WORKBENCH_TOOLS[0]!;
    const duplicated = [...AI_WORKBENCH_TOOLS.slice(0, 159), first];
    expect(validateAiWorkbenchTools(duplicated)).toBe(false);
    const incomplete = AI_WORKBENCH_TOOLS.map((tool, index) => index === 0 ? { ...tool, instruction: '' } : tool);
    expect(validateAiWorkbenchTools(incomplete)).toBe(false);
  });
});
