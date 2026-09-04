import { describe, expect, it } from "vitest";
import { prepareAgentSkillPackage } from "./skill-package";
import { compileAgentSkillCapabilities, compileAgentSkillCapability } from "./capability-compiler";

function skill(markdown: string) {
  return prepareAgentSkillPackage([{ path: "SKILL.md", content: markdown }]);
}

describe("Blackstar Capability Compiler", () => {
  it("compiles declared capabilities and dependency scopes into an executable contract", () => {
    const prepared = skill(`---
name: commerce-operator
description: Operates approved commerce workflows.
version: 1.0.0
requires_tools: [shopify.orders.read, shopify.orders.write]
requires_providers: [shopify]
provides_capabilities: [commerce.orders.read, commerce.orders.manage]
dangerous: false
---
Use the approved commerce tools to inspect and manage orders.`);

    const compiled = compileAgentSkillCapability(prepared, {
      tools: ["shopify.orders.read", "shopify.orders.write"],
      providers: ["shopify"],
    });

    expect(compiled).toMatchObject({
      id: "skill:commerce-operator@1.0.0",
      source: "agent-skill",
      capabilities: ["commerce.orders.manage", "commerce.orders.read"],
      toolScopes: ["shopify.orders.read", "shopify.orders.write"],
      providerScopes: ["shopify"],
      executable: true,
      blockers: [],
      requiresApproval: false,
    });
  });

  it("fails closed with explicit blockers when required runtime dependencies are unavailable", () => {
    const prepared = skill(`---
name: store-manager
description: Runs store management playbooks.
version: 2.0.0
requires_tools: [etsy.listings.write]
requires_providers: [etsy]
---
Manage store listings through approved provider actions.`);

    const compiled = compileAgentSkillCapability(prepared, { tools: [], providers: [] });

    expect(compiled.executable).toBe(false);
    expect(compiled.blockers).toEqual(["missing-tool:etsy.listings.write", "missing-provider:etsy"]);
    expect(compiled.capabilities).toEqual(["skill.store-manager"]);
  });

  it("requires approval for dangerous skills even when dependencies are satisfied", () => {
    const prepared = skill(`---
name: guarded-operator
description: Performs a sensitive approved operation.
version: 1.0.0
dangerous: true
---
Perform the operation only inside the governed runtime.`);

    const compiled = compileAgentSkillCapability(prepared, { tools: [], providers: [] });

    expect(compiled.executable).toBe(true);
    expect(compiled.requiresApproval).toBe(true);
  });

  it("rejects duplicate skill identity/version contracts in a compilation batch", () => {
    const prepared = skill(`---
name: duplicate-skill
description: Demonstrates deterministic duplicate rejection.
version: 1.0.0
---
Run a deterministic playbook.`);

    expect(() => compileAgentSkillCapabilities([prepared, prepared], { tools: [], providers: [] }))
      .toThrow("Duplicate compiled capability source: skill:duplicate-skill@1.0.0");
  });

  it("rejects invalid declared capability identifiers during manifest parsing", () => {
    expect(() => skill(`---
name: invalid-capability
description: Has an invalid capability declaration.
version: 1.0.0
provides_capabilities: [Commerce Orders]
---
This should never compile.`)).toThrow("provides_capabilities");
  });
});
