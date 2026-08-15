import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

describe('workspace chat live-only contract', () => {
  it('routes chat messages through the authenticated assistant server function', () => {
    const source = read('screens/Chat.jsx');
    expect(source).toContain("assistantChat");
    expect(source).toContain("assistantFn({ data: { message, history } })");
    expect(source).not.toContain('SEED_MESSAGES');
    expect(source).not.toContain('CONVERSATIONS');
    expect(source).not.toContain("Here's how I'd approach that");
  });

  it('does not render fabricated operational records in the chat shell', () => {
    const sidebar = read('components/chat/ChatSidebar.jsx');
    const emptyState = read('components/chat/ChatEmptyState.jsx');
    const promptBox = read('components/chat/ChatPromptBox.jsx');

    for (const source of [sidebar, emptyState, promptBox]) {
      expect(source).not.toContain("from './chatData'");
    }
    expect(sidebar).toContain('session-local');
    expect(emptyState).toContain('configured live provider');
  });
});
