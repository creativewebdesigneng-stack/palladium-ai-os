// Mock data for the PalladiumAI AI Discovery engine.
// Illustrative content — backend-ready for a future discovery integration.

export const CATEGORIES = [
  { id: 'models', label: 'AI Models' },
  { id: 'agents', label: 'AI Agents' },
  { id: 'tools', label: 'AI Tools' },
  { id: 'apps', label: 'AI Apps' },
  { id: 'apis', label: 'AI APIs' },
  { id: 'companies', label: 'AI Companies' },
  { id: 'research', label: 'AI Research' },
  { id: 'news', label: 'AI News' },
];

const G = { violet:'from-violet-500 to-indigo-500', sky:'from-cyan-500 to-sky-500', amber:'from-amber-500 to-orange-500', emerald:'from-emerald-500 to-teal-500', fuchsia:'from-fuchsia-500 to-pink-500', blue:'from-blue-500 to-indigo-500', rose:'from-rose-500 to-pink-500', slate:'from-slate-500 to-zinc-500' };

export const ITEMS = [
  { id:'d1', name:'GPT-5', category:'models', desc:'Frontier reasoning model with vision and tool use across multimodal inputs.', rating:4.9, website:'openai.com/gpt-5', capabilities:['Reasoning','Vision','Tool use'], grad:G.violet, added:'Aug 6', trending:true },
  { id:'d2', name:'Claude Sonnet', category:'models', desc:'Low-latency model with strong coding, analysis and long-context understanding.', rating:4.8, website:'anthropic.com/claude', capabilities:['Coding','Analysis','200k context'], grad:G.emerald, added:'Aug 4', trending:true },
  { id:'d3', name:'Gemini 2.5 Pro', category:'models', desc:'Multimodal model with native web search and 1M token context window.', rating:4.7, website:'deepmind.google/gemini', capabilities:['Multimodal','Web search','1M context'], grad:G.blue, added:'Aug 2', trending:false },
  { id:'d4', name:'Llama 3.1 405B', category:'models', desc:'Open-weight large model for research and self-hosted inference.', rating:4.5, website:'llama.meta.com', capabilities:['Open weights','Self-host','Fine-tuning'], grad:G.slate, added:'Jul 28', trending:false },

  { id:'d5', name:'Atlas Research Agent', category:'agents', desc:'Autonomous deep-research agent with cited multi-source synthesis.', rating:4.9, website:'palladium.ai/agents/atlas', capabilities:['Web research','Citations','Reports'], grad:G.sky, added:'Aug 5', trending:true },
  { id:'d6', name:'Forge Code Agent', category:'agents', desc:'Writes, refactors and reviews code across repositories autonomously.', rating:4.8, website:'palladium.ai/agents/forge', capabilities:['Code gen','Refactor','PR review'], grad:G.emerald, added:'Aug 3', trending:true },
  { id:'d7', name:'Sentinel SOC Agent', category:'agents', desc:'Continuous security operations with threat triage and response.', rating:4.7, website:'palladium.ai/agents/sentinel', capabilities:['Threat triage','Alerting','Compliance'], grad:G.blue, added:'Jul 30', trending:false },

  { id:'d8', name:'PDF Extractor', category:'tools', desc:'Extract structured data from PDFs and invoices with layout-aware OCR.', rating:4.7, website:'palladium.ai/tools/pdf', capabilities:['OCR','Tables','Invoice parsing'], grad:G.amber, added:'Aug 1', trending:false },
  { id:'d9', name:'Sentiment Analyzer', category:'tools', desc:'Real-time sentiment and intent classification for text streams.', rating:4.6, website:'palladium.ai/tools/sentiment', capabilities:['Sentiment','Intent','Batch'], grad:G.sky, added:'Aug 6', trending:true },
  { id:'d10', name:'Voice Transcriber', category:'tools', desc:'High-accuracy speech-to-text with speaker diarisation.', rating:4.8, website:'palladium.ai/tools/transcribe', capabilities:['STT','Diarisation','40+ langs'], grad:G.fuchsia, added:'Jul 27', trending:false },

  { id:'d11', name:'Quill Content Studio', category:'apps', desc:'Multi-agent content engine for blogs, ad copy and SEO at scale.', rating:4.9, website:'quill.studio', capabilities:['Content gen','SEO','Multi-format'], grad:G.amber, added:'Aug 4', trending:true },
  { id:'d12', name:'Nexus CRM Suite', category:'apps', desc:'CRM with AI-driven lead scoring and enrichment.', rating:4.8, website:'nexuscrm.io', capabilities:['Lead scoring','Pipeline','Enrichment'], grad:G.sky, added:'Jul 29', trending:false },
  { id:'d13', name:'Pulse Support Desk', category:'apps', desc:'Tier-1/Tier-2 customer support automation platform.', rating:4.7, website:'pulse.support', capabilities:['Ticket triage','Auto-reply','KB search'], grad:G.amber, added:'Jul 26', trending:false },

  { id:'d14', name:'Palladium LLM API', category:'apis', desc:'Unified API for routing requests across GPT-5, Claude and Gemini.', rating:4.9, website:'palladium.ai/api', capabilities:['Routing','Fallbacks','Streaming'], grad:G.violet, added:'Aug 6', trending:true },
  { id:'d15', name:'Vision API', category:'apis', desc:'Image classification, OCR and object detection endpoint.', rating:4.6, website:'palladium.ai/api/vision', capabilities:['OCR','Detection','Classification'], grad:G.fuchsia, added:'Aug 2', trending:false },
  { id:'d16', name:'Embeddings API', category:'apis', desc:'High-throughput text embeddings for retrieval and clustering.', rating:4.7, website:'palladium.ai/api/embeddings', capabilities:['Embeddings','Retrieval','Clustering'], grad:G.emerald, added:'Jul 31', trending:false },

  { id:'d17', name:'OpenAI', category:'companies', desc:'Leading AI lab building frontier models and the GPT family.', rating:4.8, website:'openai.com', capabilities:['Foundation models','API','ChatGPT'], grad:G.slate, added:'—', trending:false },
  { id:'d18', name:'Anthropic', category:'companies', desc:'AI safety company behind the Claude assistant family.', rating:4.8, website:'anthropic.com', capabilities:['Constitutional AI','Assistant','Enterprise'], grad:G.emerald, added:'—', trending:true },
  { id:'d19', name:'Google DeepMind', category:'companies', desc:'Research lab building Gemini and advancing general-purpose AI.', rating:4.7, website:'deepmind.google', capabilities:['Gemini','AlphaFold','Research'], grad:G.blue, added:'—', trending:false },
  { id:'d20', name:'Mistral AI', category:'companies', desc:'European open-weight model provider for efficient inference.', rating:4.6, website:'mistral.ai', capabilities:['Open weights','Efficient','European'], grad:G.rose, added:'—', trending:true },

  { id:'d21', name:'Scalable Oversight at Scale', category:'research', desc:'Paper on evaluating frontier model outputs with human-AI collaboration.', rating:4.8, website:'arxiv.org/abs/2401.0001', capabilities:['Evaluation','Alignment','Safety'], grad:G.violet, added:'Aug 5', trending:true },
  { id:'d22', name:'Mixture-of-Experts Survey', category:'research', desc:'Comprehensive survey on sparse mixture-of-experts architectures.', rating:4.7, website:'arxiv.org/abs/2402.0002', capabilities:['MoE','Architecture','Survey'], grad:G.slate, added:'Jul 30', trending:false },
  { id:'d23', name:'Long-Context Retrieval Benchmarks', category:'research', desc:'Benchmark suite for measuring retrieval over million-token contexts.', rating:4.6, website:'arxiv.org/abs/2403.0003', capabilities:['Retrieval','Benchmarks','Long context'], grad:G.sky, added:'Aug 1', trending:false },

  { id:'d24', name:'GPT-5 launched with native tool use', category:'news', desc:'OpenAI releases GPT-5 with improved reasoning and built-in web tools.', rating:4.5, website:'openai.com/blog/gpt-5', capabilities:['Launch','Reasoning','Tools'], grad:G.violet, added:'Aug 6', trending:true },
  { id:'d25', name:'Anthropic opens Claude for enterprise', category:'news', desc:'New enterprise tier brings admin controls and on-prem options.', rating:4.4, website:'anthropic.com/news/enterprise', capabilities:['Enterprise','Admin','On-prem'], grad:G.emerald, added:'Aug 4', trending:false },
  { id:'d26', name:'Mistral raises €600M Series C', category:'news', desc:'European model lab expands compute capacity with fresh funding.', rating:4.3, website:'mistral.ai/news/series-c', capabilities:['Funding','Compute','Europe'], grad:G.rose, added:'Aug 2', trending:true },
];

export const FILTER_OPTIONS = {
  rating: [{ id: 'any', label: 'Any rating' }, { id: '4.8', label: '4.8+' }, { id: '4.5', label: '4.5+' }, { id: '4.0', label: '4.0+' }],
  sort: [{ id: 'relevance', label: 'Relevance' }, { id: 'rating', label: 'Top rated' }, { id: 'recent', label: 'Recently added' }, { id: 'trending', label: 'Trending' }],
};

export function categoryById(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }