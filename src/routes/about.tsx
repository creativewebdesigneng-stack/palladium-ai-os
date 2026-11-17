import { createFileRoute } from "@tanstack/react-router";

function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Blackstar home</a>
        <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-primary">About Blackstar</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          One governed intelligence layer for connected work.
        </h1>
        <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
          Blackstar is an AI operations platform that brings models, agents, tools,
          workflows and business workspaces together. It is being developed to help
          people coordinate intelligent systems while keeping permissions,
          approvals and operational visibility in view.
        </p>
        <div className="mt-16 grid gap-8 border-t border-border pt-10 sm:grid-cols-3">
          <section>
            <h2 className="text-xl font-semibold">Build</h2>
            <p className="mt-3 leading-7 text-muted-foreground">Create and organise AI agents, applications and repeatable workflows.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Connect</h2>
            <p className="mt-3 leading-7 text-muted-foreground">Bring supported models, tools and services into a shared workspace.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Govern</h2>
            <p className="mt-3 leading-7 text-muted-foreground">Keep access, approvals, execution records and operational status visible.</p>
          </section>
        </div>
        <div className="mt-16 flex flex-wrap gap-4">
          <a href="/features" className="rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground">Explore features</a>
          <a href="/developers" className="rounded-lg border border-border px-5 py-3 font-medium">Developer information</a>
        </div>
        <p className="mt-16 text-sm text-muted-foreground">
          Blackstar is under active development. Availability of individual services and integrations depends on their
          implementation status and any required third-party configuration.
        </p>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Blackstar" },
      { name: "description", content: "Learn about Blackstar, an AI operations platform for connected agents, tools, workflows and governed execution." },
      { property: "og:title", content: "About Blackstar" },
      { property: "og:description", content: "One governed intelligence layer for connected work." },
    ],
  }),
  component: AboutPage,
});
