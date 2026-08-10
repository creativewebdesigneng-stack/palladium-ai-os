import { Bot, Users, Wand2, Workflow, Store, Search, FileText, FolderKanban, Code2, Briefcase, Plug, Cpu } from 'lucide-react';

const features = [
  ['AI Agents', 'Build autonomous agents that think, plan, and execute across your tools.', Bot],
  ['AI Workforce', 'Assemble teams of agents that collaborate and delegate in real time.', Users],
  ['App Builder', 'Describe an app and ship it — PalladiumAI writes the code for you.', Wand2],
  ['Automation', 'Chain agents, triggers, and actions into reliable workflows.', Workflow],
  ['Marketplace', 'Discover and install agents, templates, and integrations in one click.', Store],
  ['AI Search', 'Perplexity-style research with sources, citations, and exports.', Search],
  ['File Analysis', 'Upload PDFs, sheets, and code — get summaries, data, and actions.', FileText],
  ['Projects', 'Organize agents, files, and conversations into shared workspaces.', FolderKanban],
  ['Developer Platform', 'Full SDK, webhooks, and APIs to build on top of PalladiumAI.', Code2],
  ['Business Workspace', 'Roles, permissions, and billing built for growing teams.', Briefcase],
  ['Integrations', 'Connect GitHub, Slack, Notion, Google, and 80+ services.', Plug],
  ['Multiple AI Models', 'Route between Claude, GPT, Gemini, and more — instantly.', Cpu],
];

export default function FeatureGrid() {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map(([title, desc, Icon]) => (
        <div key={title} className="group rounded-2xl border border-white/10 bg-white/[.025] p-6 transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[.04]">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-violet-300 transition group-hover:from-violet-500 group-hover:to-cyan-400 group-hover:text-white">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-medium text-white">{title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">{desc}</p>
        </div>
      ))}
    </div>
  );
}