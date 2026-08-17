import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');

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
    expect(emptyState).toContain('instead of a simulated answer');
  });

  it('grounds time-sensitive chat questions with live public web results', () => {
    const assistant = read('lib/ai/assistant.functions.ts');
    const web = read('lib/ai/web-access.server.ts');
    const bubble = read('components/chat/MessageBubble.jsx');

    expect(assistant).toContain('searchPublicWeb(data.message, 6)');
    expect(assistant).toContain('shouldUseLiveWeb');
    expect(assistant).toContain('LIVE WEB CONTEXT');
    expect(assistant).toContain('sources: webSources.map');
    expect(web).toContain('https://duckduckgo.com/html/');
    expect(web).toContain('isSafePublicUrl');
    expect(web).toContain('localhost');
    expect(bubble).toContain('Live web sources');
  });
});
