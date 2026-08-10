export const models = [
  { name: 'Claude Sonnet 4.6', provider: 'Anthropic', speed: 4, cost: 3, quality: 5, context: '200K', status: 'available', primary: true },
  { name: 'GPT-5', provider: 'OpenAI', speed: 5, cost: 4, quality: 5, context: '256K', status: 'available' },
  { name: 'Gemini 2.5 Pro', provider: 'Google', speed: 4, cost: 2, quality: 4, context: '1M', status: 'available' },
  { name: 'Grok 4', provider: 'xAI', speed: 4, cost: 3, quality: 4, context: '128K', status: 'available' },
  { name: 'DeepSeek R1', provider: 'DeepSeek', speed: 3, cost: 1, quality: 4, context: '64K', status: 'degraded' },
  { name: 'Llama 3.3 70B', provider: 'Meta', speed: 4, cost: 1, quality: 3, context: '128K', status: 'available' },
  { name: 'Mistral Large 2', provider: 'Mistral', speed: 5, cost: 2, quality: 4, context: '128K', status: 'unavailable' },
];

export const agents = [
  { id: 'a1', name: 'Research Analyst', model: 'Claude Sonnet 4.6', status: 'Running', task: 'Competitive intelligence on 5 startups', score: 94, color: 'from-violet-500 to-indigo-600', role: 'Research', category: 'Research', avatar: 'RA', tags: ['research','web'] },
  { id: 'a2', name: 'Support Copilot', model: 'GPT-5', status: 'Running', task: 'Resolving ticket #4812 — refund flow', score: 98, color: 'from-cyan-500 to-blue-600', role: 'Support', category: 'Support', avatar: 'SC', tags: ['support','email'] },
  { id: 'a3', name: 'Growth Writer', model: 'Gemini 2.5 Pro', status: 'Idle', task: 'Waiting for next brief', score: 91, color: 'from-emerald-500 to-teal-600', role: 'Content', category: 'Marketing', avatar: 'GW', tags: ['content'] },
  { id: 'a4', name: 'Code Reviewer', model: 'DeepSeek R1', status: 'Paused', task: 'PR #284 review — auth module', score: 96, color: 'from-amber-500 to-orange-600', role: 'Engineering', category: 'Engineering', avatar: 'CR', tags: ['code','github'] },
  { id: 'a5', name: 'Finance Scout', model: 'GPT-5', status: 'Running', task: 'Monthly close reconciliation', score: 97, color: 'from-fuchsia-500 to-pink-600', role: 'Finance', category: 'Finance', avatar: 'FS', tags: ['finance','docs'] },
  { id: 'a6', name: 'Ops Monitor', model: 'Llama 3.3 70B', status: 'Idle', task: 'Watching infra metrics', score: 88, color: 'from-rose-500 to-red-600', role: 'Operations', category: 'Operations', avatar: 'OM', tags: ['ops','monitor'] },
];

export const tasks = [
  { id: 't1', title: 'Q3 competitive teardown', priority: 'High', deadline: 'Aug 6', agent: 'Research Analyst', status: 'Running', duration: '12m', tools: ['Web','Docs'] },
  { id: 't2', title: 'Refund ticket #4812', priority: 'Urgent', deadline: 'Today', agent: 'Support Copilot', status: 'Running', duration: '4m', tools: ['Email','CRM'] },
  { id: 't3', title: 'Launch blog draft', priority: 'Medium', deadline: 'Aug 8', agent: 'Growth Writer', status: 'Queued', duration: '20m', tools: ['Docs'] },
  { id: 't4', title: 'PR #284 review', priority: 'High', deadline: 'Aug 5', agent: 'Code Reviewer', status: 'Failed', duration: '6m', tools: ['GitHub'] },
  { id: 't5', title: 'Monthly reconciliation', priority: 'High', deadline: 'Aug 7', agent: 'Finance Scout', status: 'Running', duration: '34m', tools: ['Sheets','API'] },
  { id: 't6', title: 'Infra health sweep', priority: 'Low', deadline: 'Aug 9', agent: 'Ops Monitor', status: 'Completed', duration: '8m', tools: ['Terminal'] },
];