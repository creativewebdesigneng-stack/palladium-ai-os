import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { inspectPageReadOnly } from "../qa-inspection.mjs";

class FakePage extends EventEmitter {
  url() { return "https://blackstar.example/ai-hub?session=secret#token"; }
  async title() { return "AI Hub"; }
  async waitForTimeout() {}
  async screenshot() { return Buffer.from("png"); }
}

test("collects bounded read-only QA evidence, redacts URL parameters and removes observers", async () => {
  const page = new FakePage();
  const result = await inspectPageReadOnly(page, async () => {
    page.emit("console", { type: () => "error", text: () => "render failed" });
    page.emit("pageerror", new Error("component crashed"));
    page.emit("requestfailed", { method: () => "GET", url: () => "https://blackstar.example/api/x?access_token=secret#private", failure: () => ({ errorText: "net::ERR_FAILED" }) });
    page.emit("response", { status: () => 500, url: () => "https://blackstar.example/api/y?key=secret", request: () => ({ method: () => "GET" }) });
    return { status: 200 };
  });

  assert.equal(result.readOnly, true);
  assert.equal(result.status, 200);
  assert.equal(result.title, "AI Hub");
  assert.equal(result.url, "https://blackstar.example/ai-hub");
  assert.match(result.screenshotDataUrl, /^data:image\/png;base64,/);
  assert.deepEqual(result.consoleErrors, ["render failed"]);
  assert.deepEqual(result.pageErrors, ["component crashed"]);
  assert.equal(result.networkErrors.length, 1);
  assert.equal(result.httpErrors.length, 1);
  assert.equal(result.networkErrors[0].includes("secret"), false);
  assert.equal(result.httpErrors[0].includes("secret"), false);
  assert.equal(page.listenerCount("console"), 0);
  assert.equal(page.listenerCount("pageerror"), 0);
  assert.equal(page.listenerCount("requestfailed"), 0);
  assert.equal(page.listenerCount("response"), 0);
});
