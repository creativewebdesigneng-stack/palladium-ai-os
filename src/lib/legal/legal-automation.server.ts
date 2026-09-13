import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyWithOutcome } from "@/lib/notifications/notify.server";
import { runLegalRegulatoryEvidenceCheck } from "./legal-regulatory-monitor.server";

type Sb = { from: (table: string) => any };

function clampLimit(limit: number, max = 20) {
  if (!Number.isFinite(limit)) return 1;
  return Math.max(1, Math.min(max, Math.trunc(limit)));
}

function asMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message.slice(0, 500) : fallback;
}

async function processDueRegulatoryWatches(sb: Sb, limit: number) {
  const now = new Date();
  const nowIso = now.toISOString();
  const staleClaim = new Date(now.getTime() - 15 * 60_000).toISOString();

  await sb
    .from("legal_regulatory_watches")
    .update({ claimed_at: null, updated_at: nowIso })
    .eq("status", "active")
    .lt("claimed_at", staleClaim);

  const { data: due, error } = await sb
    .from("legal_regulatory_watches")
    .select("*")
    .eq("status", "active")
    .lte("next_check_at", nowIso)
    .is("claimed_at", null)
    .order("next_check_at", { ascending: true })
    .limit(clampLimit(limit, 8));
  if (error) throw new Error(error.message);

  let checked = 0;
  let failed = 0;
  for (const candidate of due ?? []) {
    const claimedAt = new Date().toISOString();
    const attempts = Number(candidate.attempts ?? 0) + 1;
    const { data: claimed } = await sb
      .from("legal_regulatory_watches")
      .update({ claimed_at: claimedAt, attempts, last_error: null, updated_at: claimedAt })
      .eq("id", candidate.id)
      .eq("user_id", candidate.user_id)
      .eq("status", "active")
      .lte("next_check_at", nowIso)
      .is("claimed_at", null)
      .select("*")
      .maybeSingle();
    if (!claimed) continue;

    try {
      await runLegalRegulatoryEvidenceCheck({
        sb,
        watch: claimed,
        userId: claimed.user_id,
      });
      const intervalHours = Math.max(1, Math.min(720, Number(claimed.check_interval_hours ?? 24)));
      const nextCheckAt = new Date(Date.now() + intervalHours * 3_600_000).toISOString();
      const completedAt = new Date().toISOString();
      await sb
        .from("legal_regulatory_watches")
        .update({
          claimed_at: null,
          attempts: 0,
          last_error: null,
          next_check_at: nextCheckAt,
          updated_at: completedAt,
        })
        .eq("id", claimed.id)
        .eq("user_id", claimed.user_id)
        .eq("status", "active");
      checked += 1;
    } catch (error) {
      const retryMinutes = Math.min(60, 5 * Math.max(1, attempts));
      await sb
        .from("legal_regulatory_watches")
        .update({
          claimed_at: null,
          last_error: asMessage(error, "Regulatory watch check failed."),
          next_check_at: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
        .eq("user_id", claimed.user_id)
        .eq("status", "active");
      failed += 1;
    }
  }

  return { scanned: due?.length ?? 0, checked, failed };
}

async function processDueComplianceReviews(sb: Sb, limit: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: due, error } = await sb
    .from("legal_compliance_obligations")
    .select("id,user_id,title,jurisdiction,review_on,last_review_signal_for,status")
    .in("status", ["review", "applicable", "monitor"])
    .lte("review_on", today)
    .order("review_on", { ascending: true })
    .limit(clampLimit(limit, 30));
  if (error) throw new Error(error.message);

  let signalled = 0;
  let failed = 0;
  for (const row of due ?? []) {
    if (!row.review_on || row.last_review_signal_for === row.review_on) continue;
    const outcome = await notifyWithOutcome({
      userId: row.user_id,
      type: "legal.compliance_review_due",
      title: `Compliance review date reached: ${row.title}`,
      body: "The review date saved in your Legal Hub has arrived or passed. Review the authoritative source and current facts. This is a reminder from your saved record, not a determination that a legal deadline exists, was missed, or that the obligation applies.",
      link: "/legal-hub",
      metadata: {
        compliance_obligation_id: row.id,
        review_on: row.review_on,
        jurisdiction: row.jurisdiction,
      },
    });
    if (outcome === "failed") {
      failed += 1;
      continue;
    }
    const { error: updateError } = await sb
      .from("legal_compliance_obligations")
      .update({ last_review_signal_for: row.review_on, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", row.user_id);
    if (updateError) {
      failed += 1;
      continue;
    }
    signalled += 1;
  }
  return { scanned: due?.length ?? 0, signalled, failed };
}

async function processDueRightsDates(sb: Sb, limit: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: due, error } = await sb
    .from("legal_rights_obligations")
    .select("id,user_id,title,jurisdiction,kind,due_on,last_due_signal_for,status")
    .in("status", ["review", "active", "disputed", "monitor"])
    .lte("due_on", today)
    .order("due_on", { ascending: true })
    .limit(clampLimit(limit, 30));
  if (error) throw new Error(error.message);

  let signalled = 0;
  let failed = 0;
  for (const row of due ?? []) {
    if (!row.due_on || row.last_due_signal_for === row.due_on) continue;
    const outcome = await notifyWithOutcome({
      userId: row.user_id,
      type: "legal.recorded_date_review_due",
      title: `Recorded legal date reached: ${row.title}`,
      body: "A date saved on this Legal Hub working record has arrived or passed. Review the source, jurisdiction, facts and current legal status. Blackstar is not determining that this is a statutory deadline, that it was missed, or that any legal consequence has occurred.",
      link: "/legal-hub",
      metadata: {
        rights_obligation_id: row.id,
        due_on: row.due_on,
        kind: row.kind,
        jurisdiction: row.jurisdiction,
      },
    });
    if (outcome === "failed") {
      failed += 1;
      continue;
    }
    const { error: updateError } = await sb
      .from("legal_rights_obligations")
      .update({ last_due_signal_for: row.due_on, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", row.user_id);
    if (updateError) {
      failed += 1;
      continue;
    }
    signalled += 1;
  }
  return { scanned: due?.length ?? 0, signalled, failed };
}

export async function processDueLegalAutomation(limit = 4) {
  const sb = supabaseAdmin as unknown as Sb;
  const bounded = clampLimit(limit, 8);
  const [regulatory, compliance, rights] = await Promise.all([
    processDueRegulatoryWatches(sb, bounded),
    processDueComplianceReviews(sb, Math.max(10, bounded * 3)),
    processDueRightsDates(sb, Math.max(10, bounded * 3)),
  ]);
  return { regulatory, compliance, rights };
}
