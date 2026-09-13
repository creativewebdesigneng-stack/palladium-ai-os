# Company Hub completion contract

Blackstar's Company Hub is application-complete when the exact release candidate satisfies all of the following:

1. Backend Check succeeds on the exact PR head.
2. Vercel preview for that exact head reaches READY.
3. /company-hub returns HTTP 200 on the exact preview.
4. No new Company Hub runtime error cluster is present.
5. company_workspaces remains owner-scoped with authenticated RLS and explicit Data API grants.
6. Anonymous company workspace reads and writes remain denied.
7. The certified PR head is merged without modification.
8. The resulting production deployment reaches READY.
9. Production /company-hub returns HTTP 200.
10. Post-deployment runtime checks remain clean.

The Company Hub reuses Blackstar's existing Finance, CRM, BI, Legal, Industry, AI Workforce, agents and workflow systems. It must not duplicate execution engines or represent user-entered planning metrics as live or audited company data.

Core Company Hub financial-health calculations are implemented as deterministic shared functions with unit tests. High-stakes legal, financial, security, employment or regulated decisions remain subject to their specialist controls and human approval requirements.
