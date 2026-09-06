import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const compose = readFileSync(resolve(root, 'astra-serving/docker-compose.yml'), 'utf8')
const gateway = readFileSync(resolve(root, 'astra-serving/nginx/default.conf.template'), 'utf8')
const envExample = readFileSync(resolve(root, 'astra-serving/.env.example'), 'utf8')

describe('Blackstar Astra serving bundle policy', () => {
  it('pins the inference image and never publishes the raw model listener', () => {
    expect(compose).toContain('vllm/vllm-openai:v0.28.0')
    expect(compose).toContain('expose:\n      - "8000"')
    expect(compose).not.toMatch(/model:[\s\S]*?ports:\s*\n\s*-\s*["']?8000:/)
    expect(compose).toContain('--enable-prefix-caching')
  })

  it('exposes only the compatible endpoints Blackstar currently consumes', () => {
    expect(gateway).toContain('location = /v1/models')
    expect(gateway).toContain('location = /v1/chat/completions')
    expect(gateway).toContain('location / {\n    return 404;')
    expect(gateway).not.toContain('/invocations')
    expect(gateway).toContain('Authorization: Bearer')
  })

  it('keeps the serving checkpoint and credentials operator-selected and secret', () => {
    expect(envExample).toContain('BLACKSTAR_MODEL_REPOSITORY=replace-with-your-open-weight-model')
    expect(envExample).toContain('BLACKSTAR_ASTRA_API_KEY=replace-with-a-random-secret-at-least-32-characters')
    expect(envExample).not.toMatch(/sk-[A-Za-z0-9]/)
    expect(envExample).not.toMatch(/hf_[A-Za-z0-9]{20,}/)
  })
})
