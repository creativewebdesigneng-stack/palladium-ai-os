import { describe, expect, it } from "vitest";
import { matchWorkspaceRows } from "../search.functions";

describe("workspace search matching", () => {
  it("treats punctuation and PostgREST-looking input as literal text", () => {
    const query = "alpha.or(status.eq.admin)";
    const results = matchWorkspaceRows(
      {
        projects: [
          { id: "p1", name: `Customer ${query} migration`, status: "active" },
          { id: "p2", name: "Unrelated project", status: "active" },
        ],
      },
      query,
      20,
    );

    expect(results).toEqual([
      {
        type: "project",
        id: "p1",
        title: `Customer ${query} migration`,
        subtitle: "Project · active",
        href: "/projects",
      },
    ]);
  });

  it("never returns rows that were not supplied by the authorised data source", () => {
    const results = matchWorkspaceRows(
      {
        agents: [{ id: "visible", name: "Invoice Reviewer", category: "finance", status: "active" }],
      },
      "invoice",
      20,
    );

    expect(results.map((result) => result.id)).toEqual(["visible"]);
    expect(results.some((result) => result.id === "foreign-agent")).toBe(false);
  });

  it("caps the response even when many authorised rows match", () => {
    const projects = Array.from({ length: 50 }, (_, index) => ({
      id: `project-${index}`,
      name: `Alpha project ${index}`,
      status: "active",
    }));

    expect(matchWorkspaceRows({ projects }, "alpha", 7)).toHaveLength(7);
    expect(matchWorkspaceRows({ projects }, "alpha", 100)).toHaveLength(30);
  });

  it("matches across the supported resource types and emits navigation-safe metadata", () => {
    const results = matchWorkspaceRows(
      {
        projects: [{ id: "p", name: "Quarterly Alpha", status: "active" }],
        agents: [{ id: "a", name: "Alpha Analyst", category: "analysis", status: "active" }],
        tasks: [{ id: "t", title: "Alpha brief", status: "queued" }],
        workflows: [{ id: "w", name: "Alpha workflow", status: "draft", trigger_type: "manual" }],
        documents: [{ id: "d", title: "Alpha notes", mime_type: "text/plain", metadata: { source: "upload" } }],
      },
      "alpha",
      20,
    );

    expect(results.map((result) => result.type)).toEqual([
      "project",
      "agent",
      "task",
      "workflow",
      "file",
    ]);
    expect(results.find((result) => result.type === "agent")?.href).toBe("/agents/a");
    expect(results.every((result) => result.href.startsWith("/"))).toBe(true);
  });
});
