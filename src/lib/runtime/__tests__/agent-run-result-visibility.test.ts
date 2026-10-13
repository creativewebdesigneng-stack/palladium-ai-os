import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const streamClient = readFileSync(new URL('../run-client.js', import.meta.url), 'utf8');
const commandCenter = readFileSync(new URL('../../../components/runtime/CommandCenter.jsx', import.meta.url), 'utf8');

describe('Agent run result visibility', () => {
  it('does not accept an incomplete SSE stream as a successful run', () => {
    expect(streamClient).toContain('if (!task) {');
    expect(streamClient).toContain('The agent connection ended before a completion result arrived.');
    expect(streamClient).toContain('if (terminalError) throw new Error(terminalError);');
  });

  it('refuses a success state for tool-only output without an agent deliverable', () => {
    expect(streamClient).toContain('if (!String(task.output_text ?? task.output?.text ?? "").trim()) {');
    expect(streamClient).toContain('Tool activity alone is not a finished result.');
    expect(streamClient).toContain('Agent execution returned no final deliverable.');
  });

  it('preserves the user request when the agent fails', () => {
    expect(commandCenter).toContain("if (!finished) throw new Error('The agent run did not return a completed task.');");
    expect(commandCenter).toMatch(/if \(!finished\) throw[^;]+;\s*setInput\(''\)/);
    expect(commandCenter).toContain('No final response was produced. Check your selected model provider');
  });
});
