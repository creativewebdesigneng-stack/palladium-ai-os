const baseUrl = (process.env.BLACKSTAR_PRODUCTION_URL || "https://palladium-ai-os.vercel.app").replace(/\/$/, "");

const routes = [
  ["/", "Blackstar"],
  ["/help", "Blackstar"],
  ["/login", "Blackstar"],
  ["/register", "Blackstar"],
  ["/two-factor", "Blackstar"],
  ["/mission-control", "Blackstar"],
  ["/workforce", "Blackstar"],
  ["/ai-hub", "Blackstar"],
  ["/website-studio", "Blackstar"],
  ["/projects", "Blackstar"],
  ["/cinema-studio", "Blackstar"],
  ["/game-foundry", "Blackstar"],
  ["/three-d-studio", "Blackstar"],
];

const failures = [];
for (const [path, marker] of routes) {
  const url = `${baseUrl}${path}`;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "blackstar-production-smoke/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.text();
    const ok = response.status === 200 && body.includes(marker);
    console.log(`${ok ? "PASS" : "FAIL"} ${response.status} ${path}`);
    if (!ok) failures.push(`${path}: status=${response.status}, marker=${body.includes(marker)}`);
  } catch (error) {
    console.error(`FAIL ${path}: ${error instanceof Error ? error.message : String(error)}`);
    failures.push(`${path}: request failed`);
  }
}
if (failures.length) {
  console.error("\nProduction smoke failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nProduction smoke passed: ${routes.length}/${routes.length} routes at ${baseUrl}`);
