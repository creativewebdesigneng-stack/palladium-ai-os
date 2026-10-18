# Browser Preview acceptance — 18 October 2026

## Deployment and configuration

Preview deployment `dpl_7VwYDj7mf3m2vtkgaZxHN3npQZ5V` reached READY on tested commit
`35e79b01fbd3a5241b186b4da23aed1e0524c0c3`. The Agents route returned HTTP 200.
The repair branch has the existing Playwright endpoint, provider and simulation-disabled
configuration. The operator added the worker credential and enabled the existing
Supabase server credential for Preview. No secret values were printed or committed.

## Real agent attempt

The signed-in QA agent `b2fea39e-92d3-4a1f-8928-6ff744686630` submitted a real
runtime task against `https://httpbingo.org/html`, restricted to navigation and text
extraction with approval, memory disabled and no forms or purchases.

- Task: `e72a44cc-42f1-4707-99ab-4f736b617442`.
- Tool execution: `40359176-4e59-4439-ae6a-eac86b2b4061`.
- Tool: `browser_task`; status: `failed`; error: `Could not queue bounded browser approval.`
- No worker navigation or extraction occurred; this is **not** a passing acceptance.
- The model's response asked for approval, but the task incorrectly became `succeeded`.
  The follow-up fix preserves `requires_approval` on a queue failure so the existing
  standard and planned runtime guards stop without a completion receipt.
- Regression tests inject a missing-column database error in both streaming and
  non-streaming runs and assert no second model turn, no queued approval and no success.

## Database blocker

Read-only schema inspection confirmed that public.agent_tasks lacks both
`waiting_approval_request_id` and `approval_resume_state`.
The existing migration `supabase/migrations/20260815213000_personal_task_approval_resume.sql`
already defines these nullable columns and the approval-link index. Reuse that migration;
do not create a second approval storage mechanism.

Preview and Production share Supabase project `piwhiuangitqvwvwwcga`. Applying the
migration would change the shared Production database and has not been performed under
the Preview-only deployment authorisation. Live acceptance remains blocked until that
database change is authorised, applied and verified. Then rerun the agent, approve only
its exact read-only request, and inspect real worker output, task completion and audits.

No Production deployment, merge, migration or approval bypass was performed in this attempt.

## Follow-up: approval recorded on an outdated Preview (18 October 2026)

Read-only inspection confirms the shared database migration was later applied as
`20261018175829_personal_task_approval_resume`. Both nullable columns and the
partial index are present. The next real QA task
`d617dd4e-7d4b-4458-8a2a-a7d08cbaa44d` successfully queued immutable
browser approval `784b62f9-28e3-4d24-9bb5-d46272c332fe` and preserved
the resumable checkpoint, proving the former schema blocker is resolved.

The user approved it at 18:16:35 UTC. But the decision was served by **older**
Preview `dpl_5XQ1W45jJXUVJjh7jx93YNetP6DG` from branch
`integration/browser-worker-live-preview-20261013`, not the current repair
Preview. Vercel runtime logs show its generic `decideApproval` handler logged
`purchase_approved` and lacked a server-side Supabase credential. The request
now has `status=approved`, `execution_status=NULL`, no execution result and
no execution timestamp. The same agent task is still
`waiting_for_approval`, with zero verified worker output. **This is not live
browser acceptance.** Never re-label it as completed or replay it via SQL.

The repair branch now fails closed if generic approval routing receives
`agent_browser_task`, and the Approval Centre visibly distinguishes an
approved-but-unexecuted browser request and hides replay for single-use browser
actions. A new QA run and its own fresh human approval are required on the
correct Preview build:
`https://palladium-ai-czswlp7z7-creativewebdesigneng-7856s-projects.vercel.app`.
Inspect the browser tool execution, non-simulated navigation/extraction payload,
continued same-task result and audited approval execution before certifying.

The older Preview's environment configuration remains broken; do not use it for
acceptance. No Production deploy, PR merge or credential disclosure is authorised
by this work.
