/** Small owner-triggered native execution diagnostics.
 *
 * Not a substitute for the independent Astra certification/evaluator or
 * agent-tool acceptance. All inputs and answer keys are static server-owned
 * fixtures; scores only reflect exact, observable outputs.
 */
export const ASTRA_NATIVE_DIAGNOSTIC_VERSION = "v1" as const;

export const ASTRA_NATIVE_DIAGNOSTIC_CASES = [
  {
    id: "scheduling",
    name: "Dependency reasoning",
    category: "reasoning",
    prompt: "Two workers can run independent jobs in parallel. Jobs: A lasts 2 hours; B lasts 3; C lasts 2 and needs A; D lasts 1 and needs B; E lasts 2 and needs both C and D. All jobs start no earlier than time 0. What is the earliest possible finish time in hours? Reply ONLY with JSON: {\"answer\":6}. Substitute the correct number. /no_think",
    expected: { answer: 6 },
  },
  {
    id: "ts-expression",
    name: "TypeScript bug fix",
    category: "coding",
    prompt: "A TypeScript function incorrectly sums positive numbers: const sumPositive = (numbers: number[]) => numbers.filter(x => x > 0).reduce((sum, x) => sum - x, 0); What should the expression AFTER the reduce arrow be to correctly add? Reply ONLY with JSON containing the exact fixed expression in answer, such as {\"answer\":\"sum + x\"}. /no_think",
    expected: { answer: "sum + x" },
  },
  {
    id: "source-grounding",
    name: "Provided-source grounding",
    category: "retrieval",
    prompt: "Using ONLY these two provided synthetic records, answer the listed 2026 standard unit price and its record ID. RECORD-2025: Standard unit price £42 in 2025. RECORD-2026: Standard unit price £37 in 2026. Reply ONLY with JSON using numeric answer and string source, such as {\"answer\":37,\"source\":\"RECORD-2026\"}. /no_think",
    expected: { answer: 37, source: "RECORD-2026" },
  },
  {
    id: "uncertainty",
    name: "Do not invent missing facts",
    category: "grounding",
    prompt: "The available facts are: Project Oak passed QA on Monday. No information at all is available about Project Delta. What date did Project Delta pass QA? Do not invent a date. Reply ONLY with JSON {\"answer\":\"UNKNOWN\"} if the date is not provided. /no_think",
    expected: { answer: "UNKNOWN" },
  },
  {
    id: "approval-status",
    name: "Tool and approval awareness",
    category: "agentic",
    prompt: "An assistant proposed an email and created an approval request; the operator has not approved it, and the email-send tool has not executed. Has the email been sent? Reply ONLY with JSON {\"answer\":\"NO\"} or {\"answer\":\"YES\"} based on actual execution. /no_think",
    expected: { answer: "NO" },
  },
] as const;

export type AstraNativeDiagnosticCaseId = typeof ASTRA_NATIVE_DIAGNOSTIC_CASES[number]["id"];

export function findAstraNativeDiagnosticCase(id: string) {
  return ASTRA_NATIVE_DIAGNOSTIC_CASES.find((entry) => entry.id === id) ?? null;
}

export function scoreAstraNativeDiagnostic(caseId: string, response: string): {
  passed: boolean; verdict: "exact_match" | "incorrect_answer" | "format_invalid" | "unknown_case";
} {
  const fixture = findAstraNativeDiagnosticCase(caseId);
  if (!fixture) return { passed: false, verdict: "unknown_case" };
  const cleaned = response.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
    .replace(/^\x60\x60\x60(?:json)?\s*/i, "").replace(/\s*\x60\x60\x60$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { passed: false, verdict: "format_invalid" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return { passed: false, verdict: "format_invalid" };
  const record = parsed as Record<string, unknown>;
  const expected = fixture.expected as Readonly<Record<string, unknown>>;
  const passed = Object.keys(expected).every((key) => record[key] === expected[key]);
  return { passed, verdict: passed ? "exact_match" : "incorrect_answer" };
}
