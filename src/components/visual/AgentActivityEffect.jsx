// Subtle particle aura + status pulse revealed on agent-card hover.
// Pure CSS animations (see index.css). Kept extremely lightweight.
export default function AgentActivityEffect() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
      <span className="ap-dot ap-d1" />
      <span className="ap-dot ap-d2" />
      <span className="ap-dot ap-d3" />
      <span className="ap-dot ap-d4" />
      <span className="ap-ring" />
    </div>
  );
}