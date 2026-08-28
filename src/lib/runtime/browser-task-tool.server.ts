import type { ToolDef } from "./model-gateway.server";
import type { ToolContext } from "./tools.server";
import { createBrowserTool, resolveBrowserProvider } from "@/lib/mission/browser-agent";
import { resolveBrowserCredential } from "./browser-credentials.server";
import {
  captureBrowserDownloadFromPage,
  storeBrowserArtifact,
} from "./browser-artifacts.server";
import { runBoundedBrowserTask } from "./browser-task.server";

export const BROWSER_TASK_TOOL_DEF: ToolDef = {
  name: "browser_task",
  description:
    "Run a bounded resilient browser task inside one session. Supports navigation, structured extraction, label-based element recovery, page validation, trusted stored-credential/TOTP login, private downloads, screenshots and trace output. Every URL is domain-scoped; secrets and download bytes never enter model-visible output.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "Optional starting URL on the agent allow-list." },
      max_steps: { type: "number", description: "Hard task budget from 1 to 20 steps." },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: [
                "navigate",
                "read",
                "extract",
                "click",
                "type",
                "scroll",
                "wait",
                "screenshot",
                "validate",
                "login",
                "download",
              ],
            },
            label: {
              type: "string",
              description: "Human-visible control/field label used for resilient selector recovery.",
            },
            url: { type: "string" },
            selector: { type: "string" },
            fallback_selector: { type: "string" },
            text: {
              type: "string",
              description: "Non-secret text for a normal type action. Never provide credentials here.",
            },
            expected_text: { type: "string" },
            direction: { type: "string", enum: ["up", "down"] },
            amount: { type: "number" },
            ms: { type: "number" },
            fields: {
              type: "array",
              description: "For extract: named selectors. Required fields fail closed when empty.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  selector: { type: "string" },
                  required: { type: "boolean" },
                },
                required: ["name", "selector"],
              },
            },
            credential_id: {
              type: "string",
              description: "For login: opaque id of an owner-scoped encrypted browser credential. Never a password/token.",
            },
            username_label: { type: "string" },
            password_label: { type: "string" },
            totp_label: { type: "string" },
            submit_label: { type: "string" },
            filename_hint: { type: "string" },
          },
          required: ["action"],
        },
      },
    },
    required: ["steps"],
  },
};

export async function runBrowserTaskTool(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const allowedDomains = ctx.allowedDomains ?? [];
  let tool;
  try {
    tool = createBrowserTool(resolveBrowserProvider(), {
      allowedDomains,
      allowedTools: ["browser", "browser_task"],
      spendCap: ctx.spendCap ?? null,
    });
  } catch (error) {
    return { error: (error as Error).message };
  }

  try {
    const result = await runBoundedBrowserTask(tool, input, allowedDomains, {
      resolveCredential: async ({ credentialId, requestedDomain }) => {
        const credential = await resolveBrowserCredential({
          sb: ctx.sb,
          userId: ctx.userId,
          credentialId,
          requestedDomain,
        });
        await ctx.sb
          .from("browser_credentials")
          .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", credential.id)
          .eq("user_id", ctx.userId);
        return {
          id: credential.id,
          domain: credential.domain,
          username: credential.username,
          password: credential.password,
          totpCode: credential.totpCode,
        };
      },
      captureDownload: async ({ tool: browser, currentUrl, selector, filenameHint }) => {
        const download = await captureBrowserDownloadFromPage({
          tool: browser,
          currentUrl,
          selector,
          allowedDomains,
          ...(filenameHint ? { filenameHint } : {}),
          ...(ctx.signal ? { signal: ctx.signal } : {}),
        });
        return download;
      },
      storeDownload: async (download) =>
        storeBrowserArtifact({
          userId: ctx.userId,
          orgId: ctx.orgId,
          agentId: ctx.agentId,
          taskId: ctx.taskId,
          filename: download.filename,
          mimeType: download.mimeType,
          data: download.data,
          sourceUrl: download.sourceUrl,
        }),
    });
    return {
      provider: tool.provider,
      simulated: tool.kind === "development",
      ...(tool.kind === "development"
        ? { warning: "Development simulation — this did not happen in a real browser." }
        : {}),
      result,
    };
  } finally {
    await tool.close();
  }
}
