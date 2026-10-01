import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import {
  CheckCircle2, Copy, KeyRound, Link2, Loader2, PlugZap, RefreshCw,
  ShieldCheck, Trash2,
} from 'lucide-react'
import {
  deleteModelProviderConnection,
  listModelProviderConnections,
  saveModelProviderConnection,
  testModelProviderConnection,
} from '@/lib/runtime/model-provider-credentials.functions'

const PROVIDER_COPY = {
  openai: {
    name: 'OpenAI',
    detail: 'Use your own OpenAI API project key for Blackstar model execution.',
    placeholder: 'sk-proj-…',
  },
  anthropic: {
    name: 'Anthropic',
    detail: 'Use your own Claude API key for Blackstar model execution.',
    placeholder: 'sk-ant-…',
  },
}

export default function APIManagement() {
  const listConnections = useServerFn(listModelProviderConnections)
  const saveConnection = useServerFn(saveModelProviderConnection)
  const testConnection = useServerFn(testModelProviderConnection)
  const deleteConnection = useServerFn(deleteModelProviderConnection)
  const [providers, setProviders] = useState([])
  const [keys, setKeys] = useState({ openai: '', anthropic: '' })
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [mcpUrl, setMcpUrl] = useState('/mcp')

  const load = async () => {
    try {
      const result = await listConnections()
      setProviders(result?.providers ?? [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load AI provider connections.')
    }
  }

  useEffect(() => {
    void load()
    if (typeof window !== 'undefined') setMcpUrl(`${window.location.origin}/mcp`)
  }, [])

  const byId = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers])

  const connect = async (provider) => {
    const apiKey = String(keys[provider] ?? '').trim()
    if (!apiKey) {
      setMessage('Enter the provider API key first.')
      return
    }
    setBusy(`save:${provider}`)
    setMessage('')
    try {
      const result = await saveConnection({ data: { provider, apiKey } })
      setKeys((current) => ({ ...current, [provider]: '' }))
      setMessage(`${PROVIDER_COPY[provider].name} connected and verified${result?.models?.length ? ` · ${result.models.length} models observed` : ''}.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connection failed.')
    } finally {
      setBusy('')
    }
  }

  const test = async (provider) => {
    setBusy(`test:${provider}`)
    setMessage('')
    try {
      const result = await testConnection({ data: { provider } })
      setMessage(`${PROVIDER_COPY[provider].name} responded successfully${result?.models?.length ? ` · ${result.models.length} models observed` : ''}.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connection test failed.')
    } finally {
      setBusy('')
    }
  }

  const disconnect = async (provider) => {
    setBusy(`delete:${provider}`)
    setMessage('')
    try {
      await deleteConnection({ data: { provider } })
      setMessage(`${PROVIDER_COPY[provider].name} personal connection removed.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not disconnect the provider.')
    } finally {
      setBusy('')
    }
  }

  const copyMcp = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl)
      setMessage('Blackstar MCP URL copied.')
    } catch {
      setMessage('Copy is unavailable in this browser. Select the MCP URL manually.')
    }
  }

  return (
    <div className="space-y-5">
      <section className="blackstar-panel relative overflow-hidden rounded-[22px] border border-white/[.075] p-5 backdrop-blur-2xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-violet-300" />
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-violet-200/70">Personal model providers</p>
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-[-.03em] text-white">Bring your own OpenAI or Anthropic API access</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
              Keys are verified server-side, encrypted before persistence and never returned to this browser. A personal key is used only for your authenticated model runs.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-400/[.035] px-3 py-2 text-[10px] text-emerald-200/75">
            <ShieldCheck className="h-3.5 w-3.5" /> Server-only encrypted credentials
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {['openai', 'anthropic'].map((providerId) => {
            const provider = byId.get(providerId)
            const connection = provider?.connection
            const connected = Boolean(connection?.enabled)
            const copy = PROVIDER_COPY[providerId]
            return (
              <div key={providerId} className="rounded-2xl border border-white/[.065] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] text-xs font-semibold text-white">
                        {copy.name[0]}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{copy.name}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-600">
                          {connected ? 'Personal credential connected' : provider?.deploymentConfigured ? 'Workspace provider available' : 'Not personally connected'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] ${
                    connected ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[.04] text-zinc-600'
                  }`}>
                    {connected && <CheckCircle2 className="h-3 w-3" />}
                    {connected ? 'Verified' : provider?.deploymentConfigured ? 'Workspace' : 'Disconnected'}
                  </span>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-zinc-500">{copy.detail}</p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={keys[providerId] ?? ''}
                    onChange={(event) => setKeys((current) => ({ ...current, [providerId]: event.target.value }))}
                    placeholder={connected ? 'Enter a new key to replace the current connection' : copy.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-xl border border-white/[.07] bg-black/30 px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-violet-300/20"
                  />
                  <button
                    type="button"
                    disabled={busy !== ''}
                    onClick={() => connect(providerId)}
                    className="rounded-xl border border-violet-300/15 bg-violet-500/[.08] px-3.5 py-2.5 text-xs font-medium text-violet-100 transition hover:bg-violet-500/[.13] disabled:opacity-40"
                  >
                    {busy === `save:${providerId}` ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? 'Replace key' : 'Connect'}
                  </button>
                </div>

                {connected && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[.05] pt-3">
                    <button type="button" disabled={busy !== ''} onClick={() => test(providerId)} className="flex items-center gap-1.5 rounded-lg border border-white/[.07] px-2.5 py-2 text-[10px] text-zinc-400 hover:bg-white/[.035] hover:text-white disabled:opacity-40">
                      {busy === `test:${providerId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Test
                    </button>
                    <button type="button" disabled={busy !== ''} onClick={() => disconnect(providerId)} className="flex items-center gap-1.5 rounded-lg border border-rose-300/10 px-2.5 py-2 text-[10px] text-rose-300/70 hover:bg-rose-400/[.05] hover:text-rose-200 disabled:opacity-40">
                      <Trash2 className="h-3 w-3" /> Disconnect
                    </button>
                    <span className="ml-auto text-[9px] text-zinc-700">
                      {connection?.verifiedAt ? `Verified ${new Date(connection.verifiedAt).toLocaleString()}` : 'Connected'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {message && <div className="mt-4 rounded-xl border border-white/[.065] bg-white/[.025] px-3 py-2.5 text-[11px] text-zinc-300">{message}</div>}
      </section>

      <section className="blackstar-panel relative overflow-hidden rounded-[22px] border border-white/[.075] p-5 backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <PlugZap className="h-4 w-4 text-sky-300" />
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-sky-200/70">External AI clients</p>
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-[-.03em] text-white">Connect ChatGPT, Codex and Claude to Blackstar via MCP</h2>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
          Blackstar exposes a governed remote MCP endpoint with your normal Blackstar authentication. Client support and account eligibility are controlled by the external AI product; Blackstar does not impersonate or bypass those products.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[.065] bg-black/25 p-2">
          <Link2 className="ml-2 h-4 w-4 shrink-0 text-sky-300/70" />
          <code className="min-w-0 flex-1 truncate text-[11px] text-zinc-300">{mcpUrl}</code>
          <button type="button" onClick={copyMcp} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] text-zinc-500 hover:bg-white/[.04] hover:text-white" aria-label="Copy Blackstar MCP URL">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {[
            ['ChatGPT', 'Add Blackstar as a custom remote MCP app where your ChatGPT plan/workspace supports custom MCP.'],
            ['Codex', 'Register the Blackstar remote MCP URL in Codex, then complete the Blackstar authentication flow.'],
            ['Claude', 'Add Blackstar as an MCP server in a Claude client that supports remote MCP, then authenticate normally.'],
          ].map(([name, detail]) => (
            <div key={name} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-3.5">
              <p className="text-xs font-semibold text-white">{name}</p>
              <p className="mt-1.5 text-[10px] leading-5 text-zinc-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
