// UI filter option lists for the Analytics page. Actual metrics, activity
// and per-agent/team/model breakdowns always come from the backend — see
// src/screens/Analytics.jsx and src/lib/dashboard/dashboard.functions.ts.

export const FILTERS = {
  dates: ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'This quarter', 'This year'],
  users: ['All users', 'Aria Khan', 'Devon Lee', 'Finn Park', 'Maya Rao'],
  teams: ['All teams', 'Platform', 'Growth', 'Customer Success', 'Founders'],
  agents: ['All agents', 'Support Triage', 'Research Bot', 'Data Analyst', 'Content Writer', 'Code Reviewer'],
  projects: ['All projects', 'Palladium App', 'Palladium API', 'Marketing Site', 'Docs Portal'],
  models: ['All models', 'Claude Sonnet', 'GPT-5', 'Gemini 3 Flash', 'Claude Opus', 'Llama 3.3'],
};
