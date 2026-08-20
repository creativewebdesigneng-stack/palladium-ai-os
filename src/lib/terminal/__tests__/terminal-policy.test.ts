import { describe, expect, it } from "vitest";
import { validateTerminalCommand } from "../terminal.server";

describe("diagnostic terminal command policy", () => {
  it("allows bounded diagnostic commands", () => {
    for (const command of [
      "pwd",
      "ls -la",
      "ls /home/user",
      "whoami",
      "id",
      "date",
      "uname -a",
      "uptime",
      "df -h",
      "free -m",
      "ps aux",
      "git --version",
      "node --version",
      "python3 -V",
    ]) {
      expect(validateTerminalCommand(command)).toBe(command);
    }
  });

  it("blocks network access, arbitrary interpreters and shell composition", () => {
    for (const command of [
      "curl https://example.com",
      "wget https://example.com",
      "python -c print(1)",
      "node -e console.log(1)",
      "ls | cat",
      "pwd && whoami",
      "echo hello > /tmp/x",
      "ls $(pwd)",
      "ls ../",
      "cat /etc/passwd",
    ]) {
      expect(() => validateTerminalCommand(command)).toThrow();
    }
  });
});
