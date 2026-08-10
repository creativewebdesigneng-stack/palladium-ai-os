import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAgents from "./tools/list-agents";
import createAgent from "./tools/create-agent";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import listApprovals from "./tools/list-approvals";
import decideApproval from "./tools/decide-approval";
import listMemories from "./tools/list-memories";
import remember from "./tools/remember";

// Issuer must be the direct Supabase host; the project ref is the only value
// that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "palladiumai",
  title: "PalladiumAI",
  version: "0.1.0",
  instructions:
    "Tools for PalladiumAI, an AI workforce operating system. Use list_agents/create_agent to manage the user's personal AI agents, list_tasks/create_task for Mission Control missions, list_approvals/decide_approval for the Approval Centre (approvals may authorise spending — always confirm with the user first), and list_memories/remember for the personal memory vault.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listAgents, createAgent, listTasks, createTask, listApprovals, decideApproval, listMemories, remember],
});
