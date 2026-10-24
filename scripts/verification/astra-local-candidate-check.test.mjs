import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assertLoopbackCompatibleBase, parseArgs, parseChatResult, parseModelIds, inspectLocalCandidate } from './astra-local-candidate-check.mjs'

describe('Astra local candidate diagnostic', () => {
  it('rejects public addresses, credentials and non-v1 routes', () => {
    for (const url of ['https://example.com/v1', 'http://192.168.1.5:11434/v1', 'http://127.0.0.1:11434/api', 'http://x:y@localhost:11434/v1', 'http://localhost:11434/v1?token=abc']) {
      assert.throws(() => assertLoopbackCompatibleBase(url), /loopback/)
    }
    assert.equal(assertLoopbackCompatibleBase('http://127.0.0.1:11434/v1/'), 'http://127.0.0.1:11434/v1')
  })
  it('rejects invalid timeouts and unknown flags', () => {
    assert.throws(() => parseArgs(['--timeout-ms', '999']), /timeout/)
    assert.throws(() => parseArgs(['--unknown']), /Unknown/)
  })
  it('requires real OpenAI-compatible response shapes', () => {
    assert.deepEqual(parseModelIds({ data: [{ id: 'qwen-local' }] }), ['qwen-local'])
    assert.throws(() => parseModelIds({ models: ['qwen-local'] }), /models response/)
    assert.deepEqual(parseChatResult({ choices: [{ message: { content: 'OK' } }] }), { nonempty: true, characters: 2, upstreamModelIdentity: 'not_checked' })
    assert.equal(parseChatResult({ model: 'qwen-local', choices: [{ message: { content: 'OK' } }] }, 'qwen-local').upstreamModelIdentity, 'match')
    assert.equal(parseChatResult({ model: 'other', choices: [{ message: { content: 'OK' } }] }, 'qwen-local').upstreamModelIdentity, 'mismatch')
    assert.equal(parseChatResult({ choices: [{ message: { content: 'OK' } }] }, 'qwen-local').upstreamModelIdentity, 'missing')
    assert.throws(() => parseChatResult({ choices: [{ message: { content: '' } }] }), /chat response/)
  })
  it('does not infer or claim certification during listing', async () => {
    const calls = []
    const result = await inspectLocalCandidate({ baseUrl: 'http://localhost:11434/v1', model: 'qwen-local', probe: false, timeoutMs: 3000 }, async (url) => {
      calls.push(url)
      return new Response(JSON.stringify({ data: [{ id: 'qwen-local' }] }), { status: 200 })
    })
    assert.deepEqual(calls, ['http://localhost:11434/v1/models'])
    assert.equal(result.certified, false)
    assert.equal(result.inference, 'not_requested')
    assert.equal(result.requestedModelAvailable, true)
  })
  it('runs exactly one bounded chat request only for a listed model', async () => {
    const calls = []
    const result = await inspectLocalCandidate({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen-local', probe: true, timeoutMs: 3000 }, async (url, options) => {
      calls.push({ url, options })
      if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'qwen-local' }] }), { status: 200 })
      return new Response(JSON.stringify({ model: 'qwen-local', choices: [{ message: { content: 'OK' } }] }), { status: 200 })
    })
    assert.equal(calls.length, 2)
    assert.equal(JSON.parse(calls[1].options.body).model, 'qwen-local')
    assert.equal(result.inference, 'real_response_received')
    assert.equal(result.responseShapeValid, true)
    assert.equal(result.certified, false)
  })
  it('refuses to treat a missing or different upstream model ID as verified inference', async () => {
    for (const upstreamModel of [undefined, 'different-model']) {
      const result = await inspectLocalCandidate({ baseUrl: 'http://localhost:11434/v1', model: 'qwen-local', probe: true, timeoutMs: 3000 }, async (url) => {
        if (url.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'qwen-local' }] }), { status: 200 })
        return new Response(JSON.stringify({ ...(upstreamModel ? { model: upstreamModel } : {}), choices: [{ message: { content: 'OK' } }] }), { status: 200 })
      })
      assert.equal(result.certified, false)
      assert.equal(result.responseShapeValid, true)
      assert.equal(result.upstreamModelIdentity, upstreamModel ? 'mismatch' : 'missing')
      assert.equal(result.inference, upstreamModel ? 'upstream_model_identity_mismatch' : 'upstream_model_identity_missing')
    }
  })
  it('refuses redirects from the model listing without leaving loopback', async () => {
    let calls = 0
    const result = await inspectLocalCandidate({
      baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen-local', probe: true, timeoutMs: 3000,
    }, async (_url, options) => {
      calls++
      assert.equal(options.redirect, 'error')
      return Response.redirect('https://untrusted.example/v1/models', 302)
    })
    assert.equal(calls, 1)
    assert.equal(result.modelListing, 'http_302')
    assert.equal(result.inference, 'not_started')
    assert.equal(result.certified, false)
  })
  it('refuses redirects from the chat route and never treats them as inference', async () => {
    let calls = 0
    const result = await inspectLocalCandidate({
      baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen-local', probe: true, timeoutMs: 3000,
    }, async (url, options) => {
      calls++
      assert.equal(options.redirect, 'error')
      if (url.endsWith('/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'qwen-local' }] }), { status: 200 })
      }
      return Response.redirect('http://192.168.1.2:31415/v1/chat/completions', 302)
    })
    assert.equal(calls, 2)
    assert.equal(result.inference, 'http_302')
    assert.equal(result.responseShapeValid, false)
    assert.equal(result.certified, false)
  })
  it('does not run inference for an unlisted model', async () => {
    let calls = 0
    const result = await inspectLocalCandidate({ baseUrl: 'http://localhost:11434/v1', model: 'unknown', probe: true, timeoutMs: 3000 }, async () => {
      calls++
      return new Response(JSON.stringify({ data: [{ id: 'different' }] }), { status: 200 })
    })
    assert.equal(calls, 1)
    assert.equal(result.inference, 'model_not_listed')
  })
})
