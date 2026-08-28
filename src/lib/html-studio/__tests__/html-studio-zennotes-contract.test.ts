import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260828193000_html_studio_zennotes.sql", "utf8");
const notes = readFileSync("src/lib/notes/zen-notes.functions.ts", "utf8");
const htmlTool = readFileSync("src/lib/html-studio/html-studio-agent-tool.server.ts", "utf8");
const tools = readFileSync("src/lib/runtime/tools.server.ts", "utf8");
const notesScreen = readFileSync("src/screens/ZenNotes.jsx", "utf8");
const htmlScreen = readFileSync("src/screens/HTMLStudio.jsx", "utf8");
const notesRoute = readFileSync("src/routes/_shell/_app/zen-notes.tsx", "utf8");
const htmlRoute = readFileSync("src/routes/_shell/_app/html-studio.tsx", "utf8");
const sidebar = readFileSync("src/components/palladium/Sidebar.jsx", "utf8");

describe("HTML Studio + Zen Notes native integration", () => {
  it("adds only owner-scoped working and artifact stores", () => {
    expect(migration).toContain("create table if not exists public.zen_notes");
    expect(migration).toContain("create table if not exists public.html_studio_documents");
    expect(migration).toContain("alter table public.zen_notes enable row level security");
    expect(migration).toContain("alter table public.html_studio_documents enable row level security");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toMatch(/access_token|refresh_token|api_key|client_secret|password\s+text/i);
  });

  it("promotes notes through PalladiumAI's existing Knowledge/vector path", () => {
    expect(notes).toContain('import { ingestDocument } from "@/lib/memory/memory.server"');
    expect(notes).toContain("await ingestDocument");
    expect(notes).toContain('mime_type: "text/markdown"');
    expect(notesScreen).toContain("Promote to Knowledge");
    expect(notesScreen).toContain("promoteZenNoteToKnowledge");
  });

  it("keeps HTML generation inside the existing Harness and audit wrapper", () => {
    expect(htmlTool).toContain('name: "html_studio"');
    expect(htmlTool).toContain("create_document");
    expect(htmlTool).toContain("update_document");
    expect(tools).toContain("HTML_STUDIO_TOOL_DEF");
    expect(tools).toContain("runHtmlStudioTool");
    expect(tools).toContain("assertHarnessToolInput");
    expect(tools).toContain('"html_studio"');
    expect(tools).toContain('from("tool_executions")');
  });

  it("exposes first-class routes/navigation and a script-disabled HTML preview", () => {
    expect(notesRoute).toContain('createFileRoute("/_shell/_app/zen-notes")');
    expect(htmlRoute).toContain('createFileRoute("/_shell/_app/html-studio")');
    expect(sidebar).toContain("['Zen Notes', '/zen-notes', FileText]");
    expect(sidebar).toContain("['HTML Studio', '/html-studio', Code2]");
    expect(htmlScreen).toContain('sandbox=""');
    expect(htmlScreen).toContain("scripts disabled");
    expect(htmlScreen).toContain("createHtmlFromZenNote");
  });
});
