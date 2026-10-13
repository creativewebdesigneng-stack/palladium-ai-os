import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { inspectPageReadOnly, redactQaSecrets, attachQaDomEvidence } from "../qa-inspection.mjs";

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

test("Browser Use QA diagnostics redact URL tokens and credential-bearing error text", () => {
  const dirty = "GET https://shop.example.com/orders?access_token=private123#token Bearer abcdef0123456789 api_key=supersecret password: hiddenvalue";
  const result = redactQaSecrets(dirty);
  assert.match(result, /https:\/\/shop\.example\.com\/orders/);
  for (const secret of ["private123","abcdef0123456789","supersecret","hiddenvalue"]) {
    assert.equal(result.includes(secret), false);
  }
  assert.match(result, /Bearer \[redacted\]/);
});

test("read-only QA enrichment returns no browser form values or signed links", () => {
  const result = attachQaDomEvidence({ readOnly:true,url:"https://blackstar.example" },[
    { selector:"#email",tag:"input",type:"email",value:"private@blackstar.example" },
    { selector:"#visit",tag:"a",href:"https://blackstar.example/mission?secret=token123" },
  ]);
  assert.equal(result.readOnly,true);
  assert.equal(result.interactiveCount,2);
  assert.equal(result.interactiveItems[1].href,"https://blackstar.example/mission");
  assert.equal(JSON.stringify(result).includes("private@blackstar.example"),false);
  assert.equal(JSON.stringify(result).includes("token123"),false);
});
