const ecosystems = ['OpenAI', 'Anthropic', 'Google', 'Groq', 'Ollama', 'MCP'];

export default function TrustedLogos() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-zinc-600">
        Multi-provider by design
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
        {ecosystems.map((name) => (
          <span key={name} className="text-lg font-semibold tracking-tight text-zinc-600 transition hover:text-zinc-300">
            {name}
          </span>
        ))}
      </div>
      <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-zinc-600">
        Provider names identify supported integration ecosystems and do not imply endorsement, partnership or customer status.
      </p>
    </div>
  );
}
