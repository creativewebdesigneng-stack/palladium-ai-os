import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { probeLocalAstraForCyberGym, classifyAstraSmokeCompletion, AstraSmokeCompletionError } from './cybergym-native-smoke.mjs'

const MODEL = 'qwen3:8b-q4_K_M'
function plan(port) {
  return {
    schema: 'blackstar.cybergym.preflight.v1',
    datasetCommit: 'a'.repeat(40),
    harnessCommit: 'b'.repeat(40),
    taskIds: ['arvo:47101'],
    nativeModel: { provider: 'compatible', model: MODEL, baseUrl: 'http://127.0.0.1:' + port + '/v1' },
    network: { name: 'cybergym-internal', serverBindHost: '172.21.0.1', serverPort: 8666, allowPublicIngress: false, allowDirectEgress: false },
    limits: { maxTaskDurationSeconds: 300, maxMemoryMiB: 2048, maxCpus: 2 },
  }
}
function respond(res, data, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}
async function withFakeLoopbackServer(handler, run) {
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  try { return await run(port) }
  finally { await new Promise((resolve) => server.close(resolve)) }
}
function endpoint({ advertised = MODEL, reported = MODEL, content = 'READY', finish = 'stop', modelsStatus = 200, completionStatus = 200, onRequest } = {}) {
  return (req, res) => {
    onRequest?.(req)
    if (req.url === '/v1/models') {
      return respond(res, { data: [{ id: advertised }] }, modelsStatus)
    }
    if (req.url === '/v1/chat/completions') {
      return respond(res, { model: reported, choices: [{ message: { content }, finish_reason: finish }] }, completionStatus)
    }
    res.writeHead(404); res.end()
  }
}
test('loopback-only test transport and no-tool completion stay explicitly non-certified', async () => {
  const seen = []
  const result = await withFakeLoopbackServer(endpoint({ onRequest: (req) => seen.push({ path: req.url, method: req.method, authorization: req.headers.authorization }) }),
    (port) => probeLocalAstraForCyberGym(plan(port)))
  assert.deepEqual(seen.map((e) => [e.path, e.method]), [['/v1/models', 'GET'], ['/v1/chat/completions', 'POST']])
  assert.ok(seen.every((r) => r.authorization === undefined))
  assert.equal(result.status, 'LOCAL_MODEL_SMOKE_PASSED_BENCHMARK_BLOCKED')
  assert.equal(result.benchmarkExecuted, false)
  assert.equal(result.gpuExecutionVerified, false)
  assert.equal(result.independentlyAttested, false)
  assert.equal(result.executableApprovalGranted, false)
  assert.equal(result.officialBenchmarkScore, null)
  assert.equal(result.model, MODEL)
})
test('fails closed when pinned model is not advertised', async () => {
  await withFakeLoopbackServer(endpoint({ advertised: 'some-other-model' }), async (port) => {
    await assert.rejects(probeLocalAstraForCyberGym(plan(port)), /not advertised/)
  })
})
test('rejects an inference response from a different routed model', async () => {
  await withFakeLoopbackServer(endpoint({ reported: 'paid-fallback-model' }), async (port) => {
    await assert.rejects(probeLocalAstraForCyberGym(plan(port)), /identity did not match/)
  })
})
test('rejects empty or incorrect completion and an incomplete finish reason', async () => {
  for (const settings of [{ content: '' }, { content: 'NOT READY' }, { finish: 'length' }]) {
    await withFakeLoopbackServer(endpoint(settings), async (port) => {
      await assert.rejects(probeLocalAstraForCyberGym(plan(port)), /invalid or incomplete/)
    })
  }
})
test('rejects remote, public, tunneled and credential-bearing endpoints before any HTTP call', async () => {
  for (const url of ['https://example.com/v1', 'https://foo.trycloudflare.com/v1', 'http://localhost:11434/v1', 'http://192.168.0.8:11434/v1', 'http://key:secret@127.0.0.1:11434/v1']) {
    const config = plan(11434); config.nativeModel.baseUrl = url
    await assert.rejects(probeLocalAstraForCyberGym(config), /localhost-only/)
  }
})
test('does not follow redirects, even when Location points to a remote host', async () => {
  let seen = 0
  await withFakeLoopbackServer((req,res) => {
    seen += 1
    res.writeHead(302, { location: 'https://example.org/v1/models' }); res.end()
  }, async (port) => assert.rejects(probeLocalAstraForCyberGym(plan(port)), /not 200/))
  assert.equal(seen, 1)
})
test('does not accept error HTTP statuses as successful inference', async () => {
  await withFakeLoopbackServer(endpoint({ completionStatus: 503 }), async (port) => {
    await assert.rejects(probeLocalAstraForCyberGym(plan(port)), /not 200/)
  })
})
test('rejects oversized HTTP responses and does not expose their content', async () => {
  await withFakeLoopbackServer((req,res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ data: [{ id: 'x'.repeat(70_000) }] }))
  }, async (port) => assert.rejects(probeLocalAstraForCyberGym(plan(port)), /64 KiB cap/))
})
test('does not accept extra authority, proxy or fallback options', async () => {
  await withFakeLoopbackServer(endpoint(), async (port) => {
    await assert.rejects(probeLocalAstraForCyberGym(plan(port), { apiKey: 'secret' }), /Unsupported local smoke options/)
    await assert.rejects(probeLocalAstraForCyberGym(plan(port), { fallbackProvider: 'groq' }), /Unsupported local smoke options/)
  })
})
test('times out rather than waiting indefinitely for an unreachable or stalled local endpoint', async () => {
  await withFakeLoopbackServer((req, res) => {
    setTimeout(() => { if (!res.destroyed) respond(res, { data: [{ id: MODEL }] }) }, 350)
  }, async (port) => {
    await assert.rejects(probeLocalAstraForCyberGym(plan(port), { requestTimeoutMs: 250 }), /timed out/)
  })
})


test('strict smoke acceptance classifies only allowed final-message categories', () => {
  const frame=(content,finish='stop')=>({choices:[{message:{content},finish_reason:finish}]})
  const cases=[
    [frame('READY'),null],
    [frame(' READY  \n'),null],
    [frame('READY.'),'punctuation_after_ready'],
    [frame('READY!!'),'punctuation_after_ready'],
    [frame('ready'),'case_mismatch'],
    [frame(''), 'empty_content'],
    [frame(null), 'empty_content'],
    [frame('OTHER'), 'content_mismatch'],
    [frame('READY','length'), 'finish_length'],
    [frame('READY','content_filter'), 'finish_content_filter'],
    [frame('READY',null), 'finish_missing'],
    [frame('READY','unexpected'), 'non_stop_finish'],
    [{ choices: [] }, 'missing_message'],
    [{ choices: [{ finish_reason: 'stop' }] }, 'missing_message'],
  ]
  for (const [input, expected] of cases) {
    assert.equal(classifyAstraSmokeCompletion(input),expected)
  }
})

test('real fixture rejects punctuation but error exposes no response content', async () => {
  const privateData='SECRET_PAYLOAD_DO_NOT_ECHO'
  for (const [content,finish,expected] of [
    ['READY.','stop','punctuation_after_ready'],
    ['', 'stop','empty_content'],
    [privateData,'stop','content_mismatch'],
    ['READY','length','finish_length'],
    ['READY','content_filter','finish_content_filter'],
  ]) {
    await withFakeLoopbackServer(endpoint({content,finish}), async port => {
      let caught
      try { await probeLocalAstraForCyberGym(plan(port)) } catch(e) { caught=e }
      assert.ok(caught instanceof AstraSmokeCompletionError)
      assert.equal(caught.reason,expected)
      assert.match(caught.message,/invalid or incomplete smoke response/)
      assert.ok(!caught.message.includes(privateData))
      assert.ok(!JSON.stringify({name:caught.name,message:caught.message,reason:caught.reason}).includes(privateData))
    })
  }
})

test('private reasoning field is ignored and not used to force acceptance', () => {
  const result={ choices:[{finish_reason:'stop',message:{
    content:'',reasoning:'READY',reasoning_content:'READY',tool_calls:[],
  }}] }
  assert.equal(classifyAstraSmokeCompletion(result),'empty_content')
})


test('strict Ollama Qwen3 no-thinking control is sent on the existing loopback route', async () => {
  const seen=[]
  await withFakeLoopbackServer((req,res) => {
    const chunks=[]
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      if(req.url==='/v1/models'){
        seen.push({path:req.url,method:req.method})
        return respond(res,{data:[{id:MODEL}]})
      }
      if(req.url==='/v1/chat/completions'){
        const data=JSON.parse(Buffer.concat(chunks).toString('utf8'))
        seen.push({
          path:req.url,method:req.method,
          reasoning_effort:data.reasoning_effort,
          model:data.model,stream:data.stream,
          max_tokens:data.max_tokens,
          temperature:data.temperature,
          tools:data.tools,
        })
        return respond(res,{model:MODEL,choices:[{message:{content:'READY'},finish_reason:'stop'}]})
      }
      res.writeHead(404);res.end()
    })
  }, async port => {
    const result=await probeLocalAstraForCyberGym(plan(port))
    assert.equal(result.noToolCompletion,'PASS')
  })
  assert.deepEqual(seen[0],{path:'/v1/models',method:'GET'})
  assert.deepEqual(seen[1],{
    path:'/v1/chat/completions',method:'POST',
    reasoning_effort:'none',model:MODEL,
    stream:false,max_tokens:64,temperature:0,tools:undefined,
  })
})
