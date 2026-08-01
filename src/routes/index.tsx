import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Building2, Cpu, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { departments } from "@/lib/os-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PalladiumAI — The AI Operating System for Your Life & Business" },
      {
        name: "description",
        content:
          "PalladiumAI is an AI workforce operating system: hire autonomous agents, staff 16 departments, and run your business and personal life from one command center.",
      },
      { property: "og:title", content: "PalladiumAI — The AI Operating System" },
      {
        property: "og:description",
        content: "Hire an autonomous AI workforce. Run your business and life from one command center.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Bot, title: "An entire AI workforce", body: "Hire a CEO, managers, specialists and workers. They delegate, report and improve without prompting." },
  { icon: Workflow, title: "Missions, not chats", body: "Describe an outcome. Palladium decomposes it into tasks, assigns agents and executes until it's done." },
  { icon: Building2, title: "16 live departments", body: "Business, finance, marketing, development, health, travel and more — each with its own staff and P&L." },
  { icon: Cpu, title: "Mission Control", body: "A NASA-grade console for live telemetry, task graphs, approvals and kernel-level oversight." },
  { icon: Sparkles, title: "Marketplace", body: "Install new agents, mission templates and department packs in one click." },
  { icon: ShieldCheck, title: "Operator control", body: "Budget caps, approval gates, audit trails and permissions on every autonomous action." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 size-[640px] animate-aurora rounded-full bg-primary/15 blur-[160px]" />
        <div className="absolute -right-32 top-1/3 size-[560px] animate-aurora rounded-full bg-accent/15 blur-[160px] [animation-delay:-9s]" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6">
        <BrandLogo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#platform" className="transition-colors hover:text-foreground">Platform</a>
          <a href="#departments" className="transition-colors hover:text-foreground">Departments</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
          <Button asChild variant="hero" size="sm"><Link to="/register">Get access</Link></Button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 pt-16 text-center sm:pt-24">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" /> Kernel v4.2 · 2,481 agents online
        </span>
        <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.03] tracking-tight sm:text-7xl">
          The AI operating system for<br className="hidden sm:block" /> <span className="text-gradient">your life and business</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Not a chatbot. A workforce. Palladium staffs autonomous departments, runs missions end to end and reports back like a company that never sleeps.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="hero" size="lg"><Link to="/register">Provision your workforce <ArrowRight className="size-4" /></Link></Button>
          <Button asChild variant="glass" size="lg"><Link to="/app">Explore the live OS</Link></Button>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="panel p-6 transition-all hover:-translate-y-1 hover:border-primary/40">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="departments" className="mx-auto max-w-7xl px-5 pb-24">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Sixteen departments, fully staffed</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Every department ships with its own manager, workers, goals, analytics and automations.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {departments.map((d) => (
            <div key={d.slug} className="glass flex items-center gap-2.5 rounded-xl px-3.5 py-3">
              <d.icon className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate text-xs font-medium">{d.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 pb-28">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Operator", "£49", "1 department, 12 agents, 5M tokens"],
            ["Founder", "£249", "6 departments, 240 agents, mission templates"],
            ["Enterprise", "£1,499", "Unlimited departments, dedicated kernel, SSO"],
          ].map(([name, price, body], i) => (
            <div key={name} className={`panel p-7 ${i === 1 ? "border-primary/50" : ""}`}>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{name}</p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight">{price}<span className="text-sm text-muted-foreground">/mo</span></p>
              <p className="mt-3 text-sm text-muted-foreground">{body}</p>
              <Button asChild variant={i === 1 ? "hero" : "outline"} size="sm" className="mt-6 w-full"><Link to="/register">Start now</Link></Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLogo />
          <p className="text-xs text-muted-foreground">© 2026 PalladiumAI. An operating system for autonomous work.</p>
        </div>
      </footer>
    </div>
  );
}
