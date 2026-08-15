import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createApprovedMissionEmailDraft } from "./mission.server";
import { notify } from "@/lib/notifications/notify.server";

type Sb = { from: (t: string) => any };
type EmailProvider = "google" | "microsoft";

function safeDetails(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function connectedEmailProvider(
  sb: Sb,
  userId: string,
  preferred: unknown,
): Promise<EmailProvider | null> {
  const { data, error } = await sb
    .from("integrations")
    .select("provider,status,connected_at")
    .eq("user_id", userId)
    .in("provider", ["google", "microsoft"])
    .eq("status", "connected")
    .order("connected_at", { ascending: false });
  if (error) throw new Error(error.message);

  const available = (data ?? [])
    .map((row: any) => row.provider)
    .filter((provider: unknown): provider is EmailProvider =>
      provider === "google" || provider === "microsoft",
    );
  const requested = preferred === "google" || preferred === "microsoft" ? preferred : null;
  if (requested && available.includes(requested)) return requested;
  return available[0] ?? null;
}

/**
 * Decides an email_send approval and, on approval, creates a draft in the
 * operator's connected Google Workspace or Microsoft 365 mailbox.
 *
 * This path never sends mail. The provider executors expose draft creation only.
 */
export const decideEmailApproval = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; decision: "approve" | "reject"; note?: string }) => {
      const id = String(input?.id ?? "").trim();
      if (!id) throw new Error("Approval request id is required");
      if (input?.decision !== "approve" && input?.decision !== "reject") {
        throw new Error("Invalid decision");
      }
      return {
        id,
        decision: input.decision,
        note: typeof input.note === "string" ? input.note.slice(0, 1000) : null,
      };
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const current = await sb
      .from("approval_requests")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (current.error) throw new Error(current.error.message);

    const approval = current.data;
    if (!approval) throw new Error("Approval request not found");
    if (approval.action_type !== "email_send") {
      throw new Error("This approval is not an email action");
    }
    if (approval.status !== "pending") {
      throw new Error("This request has already been decided");
    }

    const details = safeDetails(approval.details);

    if (data.decision === "reject") {
      const rejected = await sb
        .from("approval_requests")
        .update({
          status: "rejected",
          decided_at: new Date().toISOString(),
          decided_by: userId,
          decision_note: data.note,
        })
        .eq("id", data.id)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (rejected.error) throw new Error(rejected.error.message);
      if (!rejected.data) throw new Error("This request has already been decided");

      if (approval.task_id) {
        await sb
          .from("personal_tasks")
          .update({ status: "cancelled" })
          .eq("id", approval.task_id)
          .eq("user_id", userId);
      }

      await sb.from("mission_audit_logs").insert({
        user_id: userId,
        agent_id: approval.agent_id ?? null,
        action: "email_draft_rejected",
        target_type: "approval_request",
        target_id: approval.id,
        status: "success",
        metadata: { task_id: approval.task_id ?? null },
      });
      return { status: "rejected" as const };
    }

    const to = str(details.to, 500);
    const subject = str(details.subject, 998);
    const body = typeof details.body === "string" ? details.body.slice(0, 100_000) : "";
    const cc = str(details.cc, 500) || null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      throw new Error("The approved email does not contain a valid recipient address");
    }
    if (!subject) throw new Error("The approved email does not contain a subject");

    const provider = await connectedEmailProvider(sb, userId, details.provider);
    if (!provider) {
      throw new Error("Connect Google Workspace or Microsoft 365 before approving this email draft");
    }

    // Claim the pending approval before the external side effect. This is the
    // first-writer-wins guard that prevents two tabs creating duplicate drafts.
    const approved = await sb
      .from("approval_requests")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by: userId,
        decision_note: data.note,
      })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (approved.error) throw new Error(approved.error.message);
    if (!approved.data) throw new Error("This request has already been decided");

    try {
      const draft = await createApprovedMissionEmailDraft({
        userId,
        provider,
        to,
        subject,
        body,
        cc,
      });

      await sb
        .from("approval_requests")
        .update({
          details: {
            ...details,
            execution: {
              provider,
              status: "draft_created",
              draft_id: draft.draftId,
            },
          },
        })
        .eq("id", data.id)
        .eq("user_id", userId);

      if (approval.task_id) {
        await sb
          .from("personal_tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result: {
              email_draft: {
                provider,
                draft_id: draft.draftId,
                message_id: draft.messageId ?? null,
                thread_id: draft.threadId ?? null,
              },
            },
          })
          .eq("id", approval.task_id)
          .eq("user_id", userId);
      }

      await sb.from("agent_activities").insert({
        user_id: userId,
        agent_id: approval.agent_id ?? null,
        task_id: approval.task_id ?? null,
        kind: "completed",
        message: `Approved email saved as a ${provider === "google" ? "Gmail" : "Outlook"} draft`,
        metadata: { provider, approval_request_id: approval.id },
      });
      await sb.from("mission_audit_logs").insert({
        user_id: userId,
        agent_id: approval.agent_id ?? null,
        action: "email_draft_created",
        target_type: "approval_request",
        target_id: approval.id,
        status: "success",
        metadata: { provider, draft_id: draft.draftId, task_id: approval.task_id ?? null },
      });
      await notify({
        userId,
        type: "approval.decided",
        title: "Email draft created",
        body: `Your approved message is now a draft in ${provider === "google" ? "Gmail" : "Outlook"}. It has not been sent.`,
        link: "/mission-control",
        metadata: { approval_request_id: approval.id, provider },
      });

      return { status: "approved" as const, emailDraft: draft };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email draft creation failed";
      await sb
        .from("approval_requests")
        .update({ decision_note: `Approved, but draft creation failed: ${message.slice(0, 600)}` })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (approval.task_id) {
        await sb
          .from("personal_tasks")
          .update({ status: "failed", result: { error: message.slice(0, 500) } })
          .eq("id", approval.task_id)
          .eq("user_id", userId);
      }
      await sb.from("mission_audit_logs").insert({
        user_id: userId,
        agent_id: approval.agent_id ?? null,
        action: "email_draft_failed",
        target_type: "approval_request",
        target_id: approval.id,
        status: "failed",
        metadata: { provider, error: message.slice(0, 500), task_id: approval.task_id ?? null },
      });
      throw new Error(`Email was approved, but the draft could not be created: ${message}`);
    }
  });
