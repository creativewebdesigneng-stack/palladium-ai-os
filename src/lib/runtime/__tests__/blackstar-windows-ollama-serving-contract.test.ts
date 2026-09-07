import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const setup = readFileSync(resolve(root, 'astra-serving/windows/setup-blackstar-ollama.ps1'), 'utf8')
const readme = readFileSync(resolve(root, 'astra-serving/windows/README.md'), 'utf8')

describe('Blackstar Windows Ollama serving bundle', () => {
  it('keeps the default Ollama listener on localhost and uses the compatible /v1 contract', () => {
    expect(setup).toContain('http://127.0.0.1:11434')
    expect(setup).toContain('$OpenAiBaseUrl = "$BaseUrl/v1"')
    expect(setup).toContain('/models')
    expect(setup).toContain('/chat/completions')
    expect(setup).not.toMatch(/0\.0\.0\.0:11434/)
  })

  it('uses the intended 8B quantized development model by default', () => {
    expect(setup).toContain('[string]$Model = "qwen3:8b-q4_K_M"')
    expect(readme).toContain('qwen3:8b-q4_K_M')
  })

  it('gives thinking-capable Qwen3 enough completion budget to emit final content', () => {
    expect(setup).toContain('BLACKSTAR_READY /no_think')
    expect(setup).toContain('max_tokens = 512')
    expect(setup).toContain('TimeoutSec 300')
  })

  it('prints the exact Blackstar native-primary environment contract', () => {
    expect(setup).toContain('OPENAI_COMPATIBLE_BASE_URL=$OpenAiBaseUrl')
    expect(setup).toContain('BLACKSTAR_NATIVE_MODEL=$Model')
    expect(setup).toContain('BLACKSTAR_NATIVE_PRIMARY=true')
  })

  it('does not embed an API credential or fabricate certification evidence', () => {
    expect(setup).not.toMatch(/OPENAI_COMPATIBLE_API_KEY\s*=\s*[^$\r\n]+/)
    expect(setup).not.toMatch(/model_eval_verified_evidence|model_eval_runs|attest/i)
    expect(readme).toContain('does not create Model Arena runs, attestations or verified evidence')
  })

  it('warns against directly exposing the Ollama port to the public internet', () => {
    expect(setup).toContain('Do not expose port 11434 directly to the public internet')
    expect(readme).toContain('Do **not** expose Ollama\'s port 11434 directly to the internet')
  })
})
