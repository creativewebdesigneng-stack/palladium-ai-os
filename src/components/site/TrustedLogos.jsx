const logos = ['Microsoft', 'Google', 'OpenAI', 'Anthropic', 'Meta', 'NVIDIA'];

export default function TrustedLogos() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-zinc-600">Trusted by teams building the future</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
        {logos.map(l => (
          <span key={l} className="text-lg font-semibold tracking-tight text-zinc-600 grayscale transition hover:text-zinc-300">{l}</span>
        ))}
      </div>
    </div>
  );
}