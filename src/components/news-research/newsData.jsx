// Mock data for the PalladiumAI AI News & Research page.
// Illustrative content — backend-ready for a future news/research integration.

export const SECTIONS = [
  { id: 'all', label: 'All' },
  { id: 'latest', label: 'Latest AI News' },
  { id: 'research', label: 'Research Papers' },
  { id: 'models', label: 'Model Releases' },
  { id: 'industry', label: 'Industry News' },
  { id: 'developer', label: 'Developer News' },
  { id: 'business', label: 'Business AI' },
  { id: 'security', label: 'AI Security' },
];

const G = { violet:'from-violet-500 to-indigo-500', sky:'from-cyan-500 to-sky-500', amber:'from-amber-500 to-orange-500', emerald:'from-emerald-500 to-teal-500', fuchsia:'from-fuchsia-500 to-pink-500', blue:'from-blue-500 to-indigo-500', rose:'from-rose-500 to-pink-500', slate:'from-slate-500 to-zinc-500' };

export const ARTICLES = [
  { id:'a1', title:'GPT-5 launched with native tool use and vision', summary:'OpenAI releases GPT-5, combining stronger reasoning with built-in web search and vision, claiming state-of-the-art on coding and math benchmarks.', source:'TechCrunch', date:'Aug 7, 2026', section:'latest', grad:G.violet, readTime:'5 min', tags:['Launch','Reasoning','Tools'] },
  { id:'a2', title:'Anthropic opens Claude Enterprise with on-prem options', summary:'New enterprise tier brings admin controls, SSO and on-premises deployment for regulated industries.', source:'The Verge', date:'Aug 6, 2026', section:'business', grad:G.emerald, readTime:'4 min', tags:['Enterprise','On-prem','SSO'] },
  { id:'a3', title:'Scalable oversight for frontier models at scale', summary:'A new paper proposes human-AI collaboration frameworks to evaluate model outputs where human review alone does not scale.', source:'arXiv', date:'Aug 5, 2026', section:'research', grad:G.violet, readTime:'12 min', tags:['Evaluation','Alignment','Safety'] },
  { id:'a4', title:'Mixture-of-Experts architectures: a 2026 survey', summary:'Comprehensive survey of sparse MoE design patterns, routing strategies and training stability across frontier labs.', source:'arXiv', date:'Aug 4, 2026', section:'research', grad:G.slate, readTime:'18 min', tags:['MoE','Architecture','Survey'] },
  { id:'a5', title:'Mistral raises €600M Series C to expand compute', summary:'European open-weight model lab secures fresh funding to triple its GPU capacity and launch a new inference platform.', source:'Reuters', date:'Aug 4, 2026', section:'industry', grad:G.rose, readTime:'3 min', tags:['Funding','Compute','Europe'] },
  { id:'a6', title:'Long-context retrieval benchmarks for million-token models', summary:'Benchmark suite measuring needle-in-haystack retrieval across providers reveals sharp degradation beyond 800k tokens for some.', source:'DeepMind Blog', date:'Aug 3, 2026', section:'research', grad:G.sky, readTime:'9 min', tags:['Retrieval','Benchmarks','Long context'] },
  { id:'a7', title:'Gemini 2.5 Pro adds 1M context and native search', summary:'Google DeepMind ships Gemini 2.5 Pro with a one-million-token window and integrated web search grounding.', source:'Google Blog', date:'Aug 2, 2026', section:'models', grad:G.blue, readTime:'6 min', tags:['Gemini','1M context','Web search'] },
  { id:'a8', title:'New PyTorch 2.6 slashes distributed training overhead', summary:'Updated distributed compiler reduces all-reduce overhead by up to 30% on large transformer workloads.', source:'Meta Engineering', date:'Aug 2, 2026', section:'developer', grad:G.emerald, readTime:'7 min', tags:['PyTorch','Training','Performance'] },
  { id:'a9', title:'Model distillation toolkit released for open weights', summary:'New open-source toolkit helps teams compress frontier models into efficient deployable variants.', source:'Hugging Face', date:'Aug 1, 2026', section:'developer', grad:G.fuchsia, readTime:'8 min', tags:['Distillation','Open source','Efficiency'] },
  { id:'a10', title:'Small-business CRM market to double by 2028', summary:'Industry report forecasts SMB AI-CRM spend doubling, driven by automation and lead-scoring adoption.', source:'Forrester', date:'Jul 31, 2026', section:'business', grad:G.amber, readTime:'5 min', tags:['CRM','Forecast','SMB'] },
  { id:'a11', title:'Prompt injection attacks surge against AI agents', summary:'Security researchers report a 4x rise in indirect prompt injection targeting tool-using agents in production.', source:'The Register', date:'Jul 30, 2026', section:'security', grad:G.rose, readTime:'6 min', tags:['Prompt injection','Agents','Threats'] },
  { id:'a12', title:'Data exfiltration via multimodal models: a case study', summary:'Researchers demonstrate how malicious images can coax vision models into leaking embedded instructions.', source:'arXiv', date:'Jul 30, 2026', section:'security', grad:G.slate, readTime:'11 min', tags:['Multimodal','Exfiltration','Case study'] },
  { id:'a13', title:'AI governance frameworks gain enterprise adoption', summary:'Fortune 500 firms roll out internal AI governance boards as regulators signal stricter oversight.', source:'Wall Street Journal', date:'Jul 29, 2026', section:'industry', grad:G.amber, readTime:'4 min', tags:['Governance','Regulation','Enterprise'] },
  { id:'a14', title:'Llama 3.1 405B open weights released for self-hosting', summary:'Meta releases the largest open-weight model yet, enabling research and on-prem inference at frontier scale.', source:'Meta AI', date:'Jul 28, 2026', section:'models', grad:G.slate, readTime:'5 min', tags:['Llama','Open weights','Self-host'] },
  { id:'a15', title:'Vector database benchmark: pgvector vs dedicated stores', summary:'Engineering team benchmarks pgvector, Pinecone and Weaviate for retrieval latency at 100M vectors.', source:'Engineering Blog', date:'Jul 27, 2026', section:'developer', grad:G.emerald, readTime:'10 min', tags:['Vector DB','Benchmarks','Retrieval'] },
  { id:'a16', title:'AI agents now drive 30% of Tier-1 support tickets', summary:'Survey finds autonomous agents resolving a third of first-line support tickets across mid-market firms.', source:'Gartner', date:'Jul 26, 2026', section:'business', grad:G.amber, readTime:'4 min', tags:['Support','Automation','Survey'] },
  { id:'a17', title:'Red-teaming standard proposed for model releases', summary:'Industry consortium proposes a shared red-teaming protocol before frontier model deployment.', source:'NIST', date:'Jul 25, 2026', section:'security', grad:G.blue, readTime:'7 min', tags:['Red teaming','Standard','Deployment'] },
  { id:'a18', title:'New open SDK unifies LLM routing and fallbacks', summary:'Open-source SDK lets developers route across providers with automatic fallback and cost controls.', source:'GitHub Blog', date:'Jul 24, 2026', section:'developer', grad:G.fuchsia, readTime:'6 min', tags:['SDK','Routing','Open source'] },
  { id:'a19', title:'Foundation model startups consolidate as compute costs bite', summary:'A wave of acquisitions hits the foundation-model space as smaller labs seek backing to keep up.', source:'Bloomberg', date:'Jul 23, 2026', section:'industry', grad:G.violet, readTime:'5 min', tags:['M&A','Startups','Compute'] },
  { id:'a20', title:'Smarter evals: beyond accuracy for agentic systems', summary:'Paper argues for task-completion and safety evals over raw accuracy when grading agent reliability.', source:'arXiv', date:'Jul 22, 2026', section:'research', grad:G.emerald, readTime:'13 min', tags:['Evals','Agents','Reliability'] },
];

export function sectionLabel(id) { return SECTIONS.find(s => s.id === id)?.label || id; }

export const MOCK_AI = {
  summarise: (a) => `Summary: ${a.summary} Key points: ${a.tags.map(t => t).join(', ')}. Verdict: a ${a.readTime} read relevant to ${sectionLabel(a.section)}.`,
  explain: (a) => `In plain terms: ${a.summary} This matters because it signals where the ${sectionLabel(a.section)} field is heading next. The tags ${a.tags.join(', ')} capture the core themes.`,
  compare: (a, b) => `Comparing "${a.title}" (${a.source}) with "${b.title}" (${b.source}): both touch on AI progress, but the first focuses on ${a.tags.join(' & ')}, while the second centres on ${b.tags.join(' & ')}. The first is a ${a.readTime} read, the second ${b.readTime}.`,
  ask: (a) => `Ask AI: Based on "${a.title}", here is a concise answer drawing on the mock summary — ${a.summary} Want me to dig deeper into any tag (${a.tags.join(', ')})?`,
};