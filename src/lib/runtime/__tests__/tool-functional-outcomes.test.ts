import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from './fake-supabase';
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: createFakeSupabase() }));
import { executeTool } from '../tools.server';
import { toolResultError } from '../tools-core.server';
function fixture() { return createFakeSupabase({ tool_executions: [], approval_requests: [], purchase_requests: [], memory_documents: [{ id: 'doc', user_id: 'owner', title: 'Fixture document', chunk_count: 1 }], memory_chunks: [{ user_id: 'owner', document_id: 'doc', chunk_index: 0, content: 'Document contents for functional verification.' }] }); }
async function run(tool: string, input: Record<string, unknown>, sb = fixture()) {
 const result = await executeTool(tool, input, { sb, userId: 'owner', orgId: null, agentId: 'agent', taskId: 'task' }, new Map([[tool, { slug: tool, requiresApproval: false, allowedDomains: ['httpbingo.org'], spendCap: 100 }]]));
 return { result, sb };
}
afterEach(() => vi.unstubAllGlobals());
describe('actual tool handler functional outcomes', () => {
 it.each([
  ['social_ops', 'list_posts', 'social_posts', 'posts'],
  ['html_studio', 'list_documents', 'html_studio_documents', 'documents'],
  ['agent_workspace', 'list_workspaces', 'agent_workspaces', 'workspaces'],
  ['seo_ops', 'list_projects', 'seo_projects', 'projects'],
  ['app_studio', 'list_apps', 'app_studio_apps', 'apps'],
  ['three_d_studio', 'list', 'three_d_jobs', 'jobs'],
  ['game_foundry', 'list_projects', 'game_foundry_projects', 'projects'],
  ['cinema_studio', 'list_projects', 'cinema_projects', 'projects'],
  ['short_video', 'list', 'media_generation_jobs', 'jobs'],
 ])('%s reads the operator fixtures and excludes another owner', async (tool, action, table, key) => {
  const sb = fixture(); sb.tables[table!] = [{ id: 'owned', user_id: 'owner', provider: 'short_video', title: 'Owned', name: 'Owned' }, { id: 'foreign', user_id: 'another-owner', provider: 'short_video', title: 'Foreign', name: 'Foreign' }];
  const { result } = await run(tool!, { action }, sb); expect(result.ok).toBe(true);
  const rows = (result.output as Record<string, Array<{ id: string }>>)[key!];
  expect(rows?.map(row => row.id)).toEqual(['owned']);
 });
 it('voxel_studio creates a real binary asset and its inspect operation reads it back', async () => {
  const created = await run('voxel_studio', { action: 'create', model: { size: { x: 2, y: 2, z: 2 }, voxels: [{ x: 0, y: 0, z: 0, color: 1 }] } });
  expect(created.result.ok).toBe(true);
  const output = created.result.output as { asset: { vox_base64: string; bytes: number }; inspection: unknown };
  expect(output.asset.bytes).toBeGreaterThan(0);
  const inspected = await run('voxel_studio', { action: 'inspect', vox_base64: output.asset.vox_base64 });
  expect(inspected.result).toMatchObject({ ok: true, output: { inspection: output.inspection } });
 });
 it.each(['2^3', 'abc123', '1;2', 'Math.sqrt(4)'])('calculator rejects unsupported %s rather than silently changing the expression', async expression => {
  const { result, sb } = await run('calculator', { expression }); expect(result).toMatchObject({ ok: false, output: { error: expect.any(String) } }); expect(sb.tables['tool_executions']![0]!['status']).toBe('failed');
 });
 it.each(['', '1 / 0', '1 +'])('calculator records invalid arithmetic %s as failed', async expression => { expect((await run('calculator', { expression })).result.ok).toBe(false); });
 it('file_analysis returns stored document text through its real handler', async () => { expect((await run('file_analysis', { document_id: 'doc' })).result).toMatchObject({ ok: true, output: { document: { id: 'doc' }, text: 'Document contents for functional verification.' } }); });
 it('missing vault documents are failed rather than successful', async () => { expect((await run('file_analysis', { document_id: 'missing' })).result.ok).toBe(false); });
 it('never reads a different user vault document or its private chunks', async () => {
   const sb = fixture();
   sb.tables['memory_documents']!.push({ id: 'other-doc', user_id: 'other-owner', title: 'Private plan', chunk_count: 1 });
   sb.tables['memory_chunks']!.push({ document_id: 'other-doc', user_id: 'other-owner', chunk_index: 0, content: 'Private data not for owner' });
   const foreign = (await run('file_analysis', { document_id: 'other-doc' }, sb)).result;
   expect(foreign.ok).toBe(false);
   const own = (await run('file_analysis', { document_id: 'doc' }, sb)).result;
   expect(own).toMatchObject({ ok: true, output: { text: 'Document contents for functional verification.' } });
   expect(JSON.stringify(own.output)).not.toContain('Private data not for owner');
 });
 it('does not claim successful vault analysis for missing or foreign indexed chunks', async () => {
   const sb = fixture();
   sb.tables['memory_chunks'] = [{ user_id: 'another-user', document_id: 'doc', chunk_index: 0, content: 'Another user text' }];
   const out = (await run('file_analysis', { document_id: 'doc' }, sb)).result;
   expect(out).toMatchObject({ ok: false, output: { error: expect.stringContaining('no readable indexed text') } });
 });
 it('database_query reads permitted data and refuses arbitrary tables', async () => {
  const sb = fixture(); sb.tables['personal_tasks'] = [{ id: 'task-fixture', title: 'Fixture' }];
  expect((await run('database_query', { table: 'personal_tasks' }, sb)).result).toMatchObject({ ok: true, output: { rows: [{ id: 'task-fixture' }] } });
  expect((await run('database_query', { table: 'auth.users' }, sb)).result.ok).toBe(false);
 });
 it('web_fetch strips scripts from the HTTP response', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('<h1>Actual parser fixture</h1><script>hidden()</script><p>Visible text</p>')); vi.stubGlobal('fetch', fetcher);
  const { result } = await run('web_fetch', { url: 'https://httpbingo.org/html' });
  expect(result).toMatchObject({ ok: true, output: { text: 'Actual parser fixture Visible text' } }); expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('web_fetch and HTTP provider errors are recorded as failed', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response('Unavailable', { status: 503 }))));
  for (const tool of ['web_fetch', 'http_request']) { const { result, sb } = await run(tool, { url: 'https://httpbingo.org/html' }); expect(result.ok).toBe(false); expect(sb.tables['tool_executions']![0]!['status']).toBe('failed'); }
 });
 it('web_search parses result titles, links and snippets from provider HTML', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<a class="result__a" href="https://httpbingo.org/html">Fixture title</a><a class="result__snippet">Fixture snippet</a>')));
  expect((await run('web_search', { query: 'fixture' })).result).toMatchObject({ ok: true, output: { results: [{ title: 'Fixture title', url: 'https://httpbingo.org/html', snippet: 'Fixture snippet' }] } });
 });
 it.each([
  ['request_approval', { title: 'Fixture approval', action_type: 'test_only' }],
  ['email_draft', { to: 'qa@example.org', subject: 'Fixture', body: 'Not sent' }],
  ['email_send', { to: 'qa@example.org', subject: 'Fixture', body: 'Not sent' }],
  ['slack_post', { channel: 'C0123456789', text: 'Not posted' }],
 ] as const)('%s queues exact input without delivering an external message', async (tool, input) => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); const { result, sb } = await run(tool, { ...input });
  expect(result.ok).toBe(true); expect((result.output as Record<string, unknown>)['approval_request_id']).toBeTruthy(); expect(sb.tables['approval_requests']).toHaveLength(1); expect(fetcher).not.toHaveBeenCalled();
 });
 it.each(['request_approval', 'email_draft', 'email_send', 'slack_post', 'prepare_purchase'])('%s cannot claim success without a persisted approval receipt', async tool => {
  const sb = fixture(); const from = sb.from.bind(sb); vi.spyOn(sb, 'from').mockImplementation(table => { const query = from(table); if (table === 'approval_requests') query.maybeSingle = async () => ({ data: null, error: null }); return query; });
  const { result } = await run(tool, { title: 'Fixture', action_type: 'test_only', to: 'qa@example.org', subject: 'Fixture', body: 'Not sent', channel: 'C0123456789', text: 'Not posted', product: 'Fixture', seller: 'Fixture', price: 10, url: 'https://httpbingo.org/html' }, sb);
  expect(result.ok).toBe(false); expect(sb.tables['tool_executions']!.at(-1)!['status']).toBe('failed');
 });
 it('prepare_purchase computes totals and only creates an approval, never a payment', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await run('prepare_purchase', { product: 'Fixture', seller: 'Fixture', price: 10, delivery_cost: 2, url: 'https://httpbingo.org/html' })).result).toMatchObject({ ok: true, output: { prepared: true, payment_authorised: false, breakdown: { total: 12 } } }); expect(fetcher).not.toHaveBeenCalled();
 });
 it('local extensions cannot log a returned error as success', async () => { const { result, sb } = await run('short_video', { action: 'unsupported' }); expect(result.ok).toBe(false); expect(sb.tables['tool_executions']![0]!['status']).toBe('failed'); });
 it.each([{ error: 'failure' }, { ok: false }, { result: { ok: false } }])('recognizes returned failure %j', output => { expect(toolResultError(output)).toEqual(expect.any(String)); });
});
