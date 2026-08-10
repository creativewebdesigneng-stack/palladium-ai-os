// Mock data for the Git & Version Control page. Backend ready.

export const REPOSITORIES = [
  { id: 'palladium-app', name: 'palladium-app', default: 'main', branches: 14, stars: 38, openPRs: 5, openIssues: 12, updated: '2m ago' },
  { id: 'palladium-api', name: 'palladium-api', default: 'main', branches: 9, stars: 21, openPRs: 2, openIssues: 4, updated: '14m ago' },
  { id: 'marketing-site', name: 'marketing-site', default: 'main', branches: 6, stars: 9, openPRs: 1, openIssues: 2, updated: '1h ago' },
];

export const BRANCH_GROUPS = [
  { id: 'main', label: 'main', branches: [{ name: 'main', ahead: 0, behind: 0, protected: true, lastCommit: 'a1b2c3d · feat: kanban dnd', author: 'Aria', time: '2m ago' }] },
  { id: 'development', label: 'development', branches: [{ name: 'develop', ahead: 4, behind: 0, protected: true, lastCommit: '4e5f6a7 · feat: auth refresh', author: 'Devon', time: '20m ago' }] },
  { id: 'feature', label: 'feature', branches: [
    { name: 'feature/agent-templates', ahead: 12, behind: 3, protected: false, lastCommit: '8b9c0d1 · add template store', author: 'Aria', time: '1h ago' },
    { name: 'feature/knowledge-graph', ahead: 7, behind: 5, protected: false, lastCommit: '2c3d4e5 · graph traversal', author: 'Finn', time: '3h ago' },
  ] },
  { id: 'bugfix', label: 'bugfix', branches: [
    { name: 'bugfix/footer-overlap', ahead: 3, behind: 8, protected: false, lastCommit: '9f0a1b2 · fix z-index', author: 'Devon', time: '5h ago' },
    { name: 'bugfix/auth-cookie', ahead: 2, behind: 1, protected: false, lastCommit: '5d6e7f8 · cookie samesite', author: 'Aria', time: '6h ago' },
  ] },
];

export const COMMITS = [
  { sha: 'a1b2c3d', author: 'Aria Khan', avatar: 'A', message: 'feat: kanban drag-and-drop', files: 8, additions: 184, deletions: 12, date: 'Aug 7, 11:42' },
  { sha: '4e5f6a7', author: 'Devon Lee', avatar: 'D', message: 'fix: auth session cookie expiry', files: 3, additions: 22, deletions: 14, date: 'Aug 7, 11:28' },
  { sha: '8b9c0d1', author: 'Aria Khan', avatar: 'A', message: 'chore: bump recharts to 2.15', files: 2, additions: 4, deletions: 4, date: 'Aug 7, 10:55' },
  { sha: '2c3d4e5', author: 'Finn Park', avatar: 'F', message: 'feat: knowledge graph traversal', files: 11, additions: 320, deletions: 8, date: 'Aug 7, 09:31' },
  { sha: '9f0a1b2', author: 'Devon Lee', avatar: 'D', message: 'fix: footer overlap on mobile', files: 1, additions: 6, deletions: 3, date: 'Aug 6, 18:14' },
];

export const CHANGES = [
  { file: 'src/components/tasks/TaskKanban.jsx', status: 'modified', additions: 42, deletions: 3 },
  { file: 'src/components/tasks/tasksData.jsx', status: 'modified', additions: 18, deletions: 2 },
  { file: 'src/pages/Tasks.jsx', status: 'modified', additions: 6, deletions: 1 },
  { file: 'src/hooks/useDnd.js', status: 'added', additions: 88, deletions: 0 },
  { file: 'src/lib/legacy.js', status: 'deleted', additions: 0, deletions: 120 },
];

export const CHANGE_STATUS_STYLE = {
  added: 'text-emerald-400 bg-emerald-400/10',
  modified: 'text-amber-400 bg-amber-400/10',
  deleted: 'text-rose-400 bg-rose-400/10',
};

export const PULL_REQUESTS = [
  { id: '#482', title: 'Kanban drag-and-drop with @hello-pangea/dnd', author: 'Aria', avatar: 'A', branch: 'feature/agent-templates → main', status: 'open', reviewers: ['Devon', 'Finn'], changes: 8, checks: { passing: 4, failing: 0, pending: 1 } },
  { id: '#481', title: 'Auth session cookie expiry fix', author: 'Devon', avatar: 'D', branch: 'bugfix/auth-cookie → develop', status: 'review', reviewers: ['Aria'], changes: 3, checks: { passing: 5, failing: 0, pending: 0 } },
  { id: '#480', title: 'Knowledge graph traversal', author: 'Finn', avatar: 'F', branch: 'feature/knowledge-graph → main', status: 'open', reviewers: ['Aria', 'Devon'], changes: 11, checks: { passing: 3, failing: 1, pending: 1 } },
  { id: '#479', title: 'Footer overlap on mobile', author: 'Devon', avatar: 'D', branch: 'bugfix/footer-overlap → develop', status: 'merged', reviewers: ['Aria'], changes: 1, checks: { passing: 5, failing: 0, pending: 0 } },
  { id: '#478', title: 'Recharts bump to 2.15', author: 'Aria', avatar: 'A', branch: 'chore/recharts → main', status: 'closed', reviewers: ['Finn'], changes: 2, checks: { passing: 5, failing: 0, pending: 0 } },
];

export const PR_STATUS_STYLE = {
  open: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  review: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  merged: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  closed: 'text-zinc-500 bg-white/5 border-white/10',
};

export const ISSUES = [
  { id: '#214', title: 'Kanban cards lose order on refresh', author: 'Aria', labels: ['bug', 'tasks'], status: 'open', date: 'Aug 6' },
  { id: '#213', title: 'Add dark mode toggle to settings', author: 'Devon', labels: ['enhancement', 'ui'], status: 'open', date: 'Aug 5' },
  { id: '#212', title: 'Webhook signature mismatch', author: 'Finn', labels: ['bug', 'integrations'], status: 'in-progress', date: 'Aug 5' },
  { id: '#211', title: 'Docs: add SDK quickstart for Python', author: 'Aria', labels: ['docs'], status: 'open', date: 'Aug 4' },
  { id: '#210', title: 'Rate limit returns 500 on burst', author: 'Devon', labels: ['bug', 'api'], status: 'closed', date: 'Aug 3' },
];

export const ISSUE_STATUS_STYLE = { open: 'text-emerald-400', 'in-progress': 'text-amber-400', closed: 'text-zinc-500' };

export const LABEL_STYLE = { bug: 'bg-rose-400/15 text-rose-300', enhancement: 'bg-sky-400/15 text-sky-300', ui: 'bg-violet-400/15 text-violet-300', integrations: 'bg-amber-400/15 text-amber-300', docs: 'bg-emerald-400/15 text-emerald-300', api: 'bg-indigo-400/15 text-indigo-300' };

export const TAGS = [
  { name: 'v2.4.0', sha: '4e5f6a7', message: 'Release 2.4.0 — auth fixes', date: 'Aug 5, 2026', author: 'Aria' },
  { name: 'v2.3.9', sha: '8b9c0d1', message: 'Release 2.3.9 — recharts bump', date: 'Jul 28, 2026', author: 'Aria' },
  { name: 'v2.3.8', sha: '2c3d4e5', message: 'Release 2.3.8 — knowledge graph', date: 'Jul 15, 2026', author: 'Finn' },
  { name: 'v2.3.7', sha: '5d6e7f8', message: 'Release 2.3.7 — footer fix', date: 'Jul 3, 2026', author: 'Devon' },
];

export const AI_ACTIONS = [
  { id: 'review', label: 'Review Code', icon: 'ScanEye', desc: 'Surface risks, smells, and suggestions across the diff' },
  { id: 'explain', label: 'Explain Changes', icon: 'MessageSquareText', desc: 'Summarize what these commits do and why' },
  { id: 'bugs', label: 'Find Bugs', icon: 'Bug', desc: 'Scan for logic errors and edge cases' },
  { id: 'commit', label: 'Generate Commit Message', icon: 'GitCommitHorizontal', desc: 'Draft a conventional commit from staged changes' },
];

export const AI_OUTPUT = {
  review: [
    { severity: 'warning', file: 'src/hooks/useDnd.js', line: 24, msg: 'Missing cleanup for drag sensor listener on unmount.' },
    { severity: 'info', file: 'src/components/tasks/TaskKanban.jsx', line: 88, msg: 'Consider memoizing column header for re-renders.' },
    { severity: 'suggestion', file: 'src/components/tasks/tasksData.jsx', line: 12, msg: 'Extract status colors into shared tokens.' },
  ],
  explain: 'This changeset introduces drag-and-drop reordering for the task Kanban board using @hello-pangea/dnd. A new useDnd hook manages sensor configuration and drag lifecycle, TaskKanban now wires onDragEnd to persist new order, and the legacy monolith file is removed in favor of the new hook.',
  bugs: [
    { severity: 'high', file: 'src/hooks/useDnd.js', line: 41, msg: 'onDragEnd references `items` from stale closure — may persist old order after concurrent updates.' },
    { severity: 'medium', file: 'src/components/tasks/TaskKanban.jsx', line: 102, msg: 'No guard when destination index equals source index — triggers an unnecessary state write.' },
  ],
  commit: 'feat(tasks): add drag-and-drop reordering to Kanban board\n\nIntroduce useDnd hook for drag lifecycle and wire onDragEnd in TaskKanban to persist new column order. Removes the legacy dnd helper module.\n\nCloses #214',
};