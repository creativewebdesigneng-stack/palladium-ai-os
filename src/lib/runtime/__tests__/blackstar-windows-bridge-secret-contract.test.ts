import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const setup = readFileSync(resolve(root, "astra-serving/windows/setup-blackstar-tailscale-funnel.ps1"), "utf8");
const copyHelper = readFileSync(resolve(root, "astra-serving/windows/copy-blackstar-bridge-token.ps1"), "utf8");

describe("Blackstar Windows bridge secret handling", () => {
  it("never prints the bearer token and stores it with Windows user protection", () => {
    expect(setup).toContain("Export-Clixml");
    expect(setup).toContain("Set-Clipboard -Value $token");
    expect(setup).toContain("value intentionally not printed");
    expect(setup).not.toContain('Write-Host "OPENAI_COMPATIBLE_API_KEY=$token"');
  });

  it("provides a clipboard-only recovery helper without echoing the secret", () => {
    expect(copyHelper).toContain("Import-Clixml");
    expect(copyHelper).toContain("SecureStringToBSTR");
    expect(copyHelper).toContain("Set-Clipboard -Value $token");
    expect(copyHelper).toContain("The secret was not printed");
    expect(copyHelper).not.toMatch(/Write-(?:Host|Output)\s+\$token/);
  });
});
