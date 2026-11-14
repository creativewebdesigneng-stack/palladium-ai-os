// Provider-preflight tests mock the model HTTP call. They still read
// OPENAI_API_KEY so the preflight can reach those mocked paths. An empty
// variable used to surface as dozens of PROVIDER_NOT_CONFIGURED failures.
import { spawnSync } from "node:child_process";

if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error(
    [
      "bun run test stopped before Vitest.",
      "",
      "OPENAI_API_KEY is not set. The provider-preflight tests are mocked and do not call OpenAI,",
      "but without this variable they fail individually with PROVIDER_NOT_CONFIGURED.",
      "CI uses a non-secret placeholder. Run:",
      "",
      "  OPENAI_API_KEY=ci-test-provider-placeholder bun run test",
      "",
      "The suite was not started, so those cases are not reported as separate product failures.",
    ].join("\n"),
  );
  process.exit(1);
}

const forwarded = process.argv.slice(2);
const child = spawnSync("bun", ["x", "vitest", "run", ...forwarded], {
  stdio: "inherit",
  env: process.env,
});
process.exit(child.status ?? 1);
