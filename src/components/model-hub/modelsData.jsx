// Mock data for the PalladiumAI AI Model Hub.
// Illustrative content — backend-ready for a future model catalog integration.

export const PROVIDERS = [
  'OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral', 'DeepSeek', 'xAI', 'Cohere', 'Open Source', 'Ollama', 'Hugging Face',
];

const PC = {
  OpenAI: 'from-emerald-500 to-teal-500',
  Anthropic: 'from-amber-500 to-orange-500',
  Google: 'from-sky-500 to-blue-500',
  Meta: 'from-indigo-500 to-violet-500',
  Mistral: 'from-rose-500 to-pink-500',
  DeepSeek: 'from-violet-500 to-fuchsia-500',
  xAI: 'from-zinc-400 to-zinc-600',
  Cohere: 'from-cyan-500 to-sky-500',
  'Open Source': 'from-emerald-500 to-lime-500',
  Ollama: 'from-slate-500 to-zinc-600',
  'Hugging Face': 'from-amber-500 to-yellow-500',
};

export const MODELS = [
  { id:'m1', name:'GPT-5', provider:'OpenAI', context:'1M tokens', capabilities:['Chat','Code','Vision','Tools','Reasoning'], speed:'Fast', cost:'$$$$', vision:true, tools:true, reasoning:true, grad:PC.OpenAI },
  { id:'m2', name:'GPT-5 mini', provider:'OpenAI', context:'256K tokens', capabilities:['Chat','Code','Tools'], speed:'Very fast', cost:'$$', vision:false, tools:true, reasoning:false, grad:PC.OpenAI },
  { id:'m3', name:'o3', provider:'OpenAI', context:'200K tokens', capabilities:['Chat','Reasoning','Code'], speed:'Slow', cost:'$$$', vision:false, tools:false, reasoning:true, grad:PC.OpenAI },
  { id:'m4', name:'Claude Opus 4.6', provider:'Anthropic', context:'500K tokens', capabilities:['Chat','Code','Vision','Reasoning'], speed:'Medium', cost:'$$$', vision:true, tools:false, reasoning:true, grad:PC.Anthropic },
  { id:'m5', name:'Claude Sonnet 4.6', provider:'Anthropic', context:'400K tokens', capabilities:['Chat','Code','Tools','Reasoning'], speed:'Fast', cost:'$$', vision:false, tools:true, reasoning:true, grad:PC.Anthropic },
  { id:'m6', name:'Gemini 2.5 Pro', provider:'Google', context:'1M tokens', capabilities:['Chat','Code','Vision','Tools','Search'], speed:'Fast', cost:'$$$', vision:true, tools:true, reasoning:true, grad:PC.Google },
  { id:'m7', name:'Gemini 2.5 Flash', provider:'Google', context:'1M tokens', capabilities:['Chat','Vision','Tools'], speed:'Very fast', cost:'$', vision:true, tools:true, reasoning:false, grad:PC.Google },
  { id:'m8', name:'Llama 3.1 405B', provider:'Meta', context:'128K tokens', capabilities:['Chat','Code'], speed:'Medium', cost:'$$', vision:false, tools:false, reasoning:false, grad:PC.Meta },
  { id:'m9', name:'Llama 3.1 70B', provider:'Meta', context:'128K tokens', capabilities:['Chat','Code'], speed:'Fast', cost:'$', vision:false, tools:false, reasoning:false, grad:PC.Meta },
  { id:'m10', name:'Mixtral 8x22B', provider:'Mistral', context:'64K tokens', capabilities:['Chat','Code','Tools'], speed:'Fast', cost:'$$', vision:false, tools:true, reasoning:false, grad:PC.Mistral },
  { id:'m11', name:'Mistral Large 2', provider:'Mistral', context:'128K tokens', capabilities:['Chat','Code','Reasoning'], speed:'Medium', cost:'$$$', vision:false, tools:false, reasoning:true, grad:PC.Mistral },
  { id:'m12', name:'DeepSeek V3', provider:'DeepSeek', context:'128K tokens', capabilities:['Chat','Code','Reasoning'], speed:'Medium', cost:'$', vision:false, tools:false, reasoning:true, grad:PC.DeepSeek },
  { id:'m13', name:'DeepSeek R1', provider:'DeepSeek', context:'64K tokens', capabilities:['Reasoning','Code'], speed:'Slow', cost:'$', vision:false, tools:false, reasoning:true, grad:PC.DeepSeek },
  { id:'m14', name:'Grok 4', provider:'xAI', context:'256K tokens', capabilities:['Chat','Vision','Search'], speed:'Fast', cost:'$$$', vision:true, tools:false, reasoning:false, grad:PC.xAI },
  { id:'m15', name:'Command R+', provider:'Cohere', context:'128K tokens', capabilities:['Chat','Tools','RAG'], speed:'Fast', cost:'$$', vision:false, tools:true, reasoning:false, grad:PC.Cohere },
  { id:'m16', name:'Qwen 2.5 72B', provider:'Open Source', context:'128K tokens', capabilities:['Chat','Code'], speed:'Medium', cost:'Free', vision:false, tools:false, reasoning:false, grad:PC['Open Source'] },
  { id:'m17', name:'Phi-4', provider:'Open Source', context:'16K tokens', capabilities:['Chat','Code'], speed:'Very fast', cost:'Free', vision:false, tools:false, reasoning:false, grad:PC['Open Source'] },
  { id:'m18', name:'Llama 3.1 8B (local)', provider:'Ollama', context:'32K tokens', capabilities:['Chat','Code'], speed:'Very fast', cost:'Free', vision:false, tools:false, reasoning:false, grad:PC.Ollama },
  { id:'m19', name:'Mistral 7B (local)', provider:'Ollama', context:'32K tokens', capabilities:['Chat'], speed:'Very fast', cost:'Free', vision:false, tools:false, reasoning:false, grad:PC.Ollama },
  { id:'m20', name:'SmolLM2 1.7B', provider:'Hugging Face', context:'8K tokens', capabilities:['Chat'], speed:'Very fast', cost:'Free', vision:false, tools:false, reasoning:false, grad:PC['Hugging Face'] },
];