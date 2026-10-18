import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ session: vi.fn(), buffered: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: mocks.session } } }));
vi.mock('../runtime.functions', () => ({ runAgentTask: mocks.buffered }));
import { streamAgentRun } from '../run-client';

const task = { id: 'synthetic-task', status: 'succeeded', output_text: 'Verified' };
function setup(parts: string[], status = 200, contentType = 'text/event-stream') {
  mocks.session.mockResolvedValue({ data: { session: { access_token: 'synthetic-test-token' } } });
  const fetcher = vi.fn().mockResolvedValue(new Response(new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  }), { status, headers: { 'Content-Type': contentType } }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
const run = (onEvent = vi.fn()) => streamAgentRun({ agentId: 'synthetic-agent', input: 'Synthetic test', onEvent, signal: undefined });

describe('agent streaming receipts', () => {
  it.each([500, 502, 503, 504])('does not replay HTTP %s through buffered execution', async status => {
    const fetcher = setup(['{"error":"Provider temporarily unavailable"}'], status, 'application/json');
    await expect(run()).rejects.toThrow('Provider temporarily unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mocks.buffered).not.toHaveBeenCalled();
  });
  it('returns a confirmed success across split frames', async () => {
    setup(['data: {"type":"status","task_id":"synthetic-task"}\n\n', 'data: {"type":"com', `plete","task":${JSON.stringify(task)}}\n\n`]);
    const onEvent = vi.fn();
    await expect(run(onEvent)).resolves.toEqual(task);
    expect(onEvent).toHaveBeenCalledTimes(2);
  });
  it('accepts CRLF framing and a final frame without a blank line', async () => {
    setup([': heartbeat\r\n\r\n', `data: {"type":"complete","task":${JSON.stringify(task)}}`]);
    await expect(run()).resolves.toEqual(task);
  });
  it('rejects a truncated stream without a successful receipt', async () => {
    setup(['data: {"type":"status","task_id":"synthetic-task"}\n\n', 'data: {"type":"delta","text":"partial"}\n\n']);
    await expect(run()).rejects.toThrow('task may still be active');
    expect(mocks.buffered).not.toHaveBeenCalled();
  });
  it('surfaces the terminal server failure and never reports completion', async () => {
    setup(['data: {"type":"error","message":"Quota exhausted"}\n\n']);
    const onEvent = vi.fn();
    await expect(run(onEvent)).rejects.toThrow('Quota exhausted');
    expect(onEvent).toHaveBeenCalledWith({ type: 'error', message: 'Quota exhausted' });
  });
  it.each([null, { id: 'synthetic-task', status: 'running' }])('rejects an invalid complete receipt %j', async receipt => {
    setup([`data: {"type":"complete","task":${JSON.stringify(receipt)}}\n\n`]);
    const onEvent = vi.fn();
    await expect(run(onEvent)).rejects.toThrow('did not confirm');
    expect(onEvent).not.toHaveBeenCalled();
  });
  it('rejects a successful HTML response instead of hanging or replaying', async () => {
    setup(['<html>Sign in</html>'], 200, 'text/html');
    await expect(run()).rejects.toThrow('unexpected response');
  });
  it('requires sign-in before making a request', async () => {
    const fetcher = setup([]);
    mocks.session.mockResolvedValue({ data: { session: null } });
    await expect(run()).rejects.toThrow('Please sign in');
    expect(fetcher).not.toHaveBeenCalled();
  });
});


describe('paused approval receipts', () => {
  it('returns an authenticated paused receipt without treating it as success', async () => {
    const paused = { id: 'task', status: 'waiting_for_approval', waiting_approval_request_id: 'approval' };
    setup([`data: ${JSON.stringify({ type: 'paused', task: paused })}\n\n`]);
    expect(await run()).toEqual(paused);
  });
  it('rejects an unlinked pause receipt', async () => {
    setup([`data: ${JSON.stringify({ type: 'paused', task: { id: 'task', status: 'waiting_for_approval' } })}\n\n`]);
    await expect(run()).rejects.toThrow('paused approval task');
  });
});
