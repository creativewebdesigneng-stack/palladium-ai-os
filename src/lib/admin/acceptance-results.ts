import { z } from "zod";
import {
  OPERATIONAL_ACCEPTANCE_ITEMS,
  type AcceptanceCategory,
} from "@/lib/admin/acceptance-catalog";

export const ACCEPTANCE_RESULT_STATUSES = [
  "verified",
  "failed",
  "declined",
  "waiting",
] as const;

export type AcceptanceResultStatus = (typeof ACCEPTANCE_RESULT_STATUSES)[number];

const acceptanceResultInput = z.object({
  itemId: z.string().regex(/^U(?:0[1-9]|1\d|2[0-4])$/),
  status: z.enum(ACCEPTANCE_RESULT_STATUSES),
  evidenceReference: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(2000).default(""),
});

export type PreparedAcceptanceResult = {
  itemId: string;
  status: AcceptanceResultStatus;
  evidenceKind: AcceptanceCategory;
  evidenceReference: string | null;
  notes: string | null;
};

export function prepareOperationalAcceptanceResult(
  input: unknown,
): PreparedAcceptanceResult {
  const parsed = acceptanceResultInput.parse(input);
  const item = OPERATIONAL_ACCEPTANCE_ITEMS.find(
    (candidate) => candidate.id === parsed.itemId,
  );
  if (!item) {
    throw new Error("Unknown operational acceptance gate.");
  }

  if (
    parsed.status === "verified"
    && (parsed.evidenceReference.length < 3 || parsed.notes.length < 10)
  ) {
    throw new Error(
      "Verified acceptance requires an evidence reference and an explanatory note.",
    );
  }

  if (parsed.status === "failed" && parsed.notes.length < 10) {
    throw new Error(
      "Failed acceptance requires a reproducible symptom or explanatory note.",
    );
  }

  return {
    itemId: parsed.itemId,
    status: parsed.status,
    evidenceKind: item.category,
    evidenceReference: parsed.evidenceReference || null,
    notes: parsed.notes || null,
  };
}


export function buildAcceptanceAuditMetadata(args: {
  previousStatus?: string | null;
  status: AcceptanceResultStatus;
  evidenceKind: AcceptanceCategory;
  evidenceReference?: string | null;
  notes?: string | null;
}) {
  return {
    previousStatus: args.previousStatus ?? null,
    status: args.status,
    evidenceKind: args.evidenceKind,
    hasEvidenceReference: Boolean(args.evidenceReference),
    notesLength: args.notes?.length ?? 0,
  };
}
