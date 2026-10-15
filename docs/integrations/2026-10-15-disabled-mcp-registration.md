# Reviewed external MCP configuration path

The MCP Hub now opens the existing CustomServerForm and saves through the existing authenticated external registry API. This replaces the disconnected mock form; it adds no new registry or transport.

All saves produce disabled, approval-required configurations. Runtime validation rejects attempts to enable, remove approval, assign an unverified organisation, omit an exact tool list, exceed 200 names or truncate an oversized name. Header values reject line breaks and use existing server-side encryption. The form supports a custom authentication header, rather than advertising unimplemented OAuth flows.

A required started audit must persist before database access. A required completion audit must persist before success is reported. If completion fails after a database write, the record remains disabled and the UI asks the user to refresh before retrying. This is not an atomic database/audit transaction and does not certify scanner, licensing, tenant-isolation or provider readiness. No activation control has been introduced. Existing transport DNS, HTTPS, redirect, response-size, owner and agent approval guards remain in place.

The existing Sheet component supplies modal focus handling and keyboard behaviour. Errors are generic so credentials and endpoint details cannot be reflected through server exception text.

Validation: 2,564 tests across 626 files passed, including 11 new registration checks, and TypeScript passed. Production build and exact deployment/live UI verification are recorded in the PR. The authenticated Supabase query found zero registered/zero enabled servers and zero audit rows before deployment. No provider configuration or credentials were submitted.

The previously deferred privileged audit credential repair and final scientific import remain paused. OpenViking still requires licensing and service review; AgentMemory requires a reviewed HTTPS gateway; the Python Browser Use adapter remains unconnected. Both Harness collections continue through the existing governed harness implementation.
