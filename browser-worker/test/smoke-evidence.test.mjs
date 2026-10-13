import test from "node:test";
import assert from "node:assert/strict";
import { SMOKE_TARGET, verifySmokeEvidence } from "../smoke-evidence.mjs";

function nav(data = {}) {
  return { httpStatus: 200, body: { ok: true, data: {
    url: SMOKE_TARGET, status: 200, title: "Test page", ...data
  } } };
}
function extract(text) {
  return { httpStatus: 200, body: { ok: true, data: { text } } };
}
test("checks genuine browser response and rendered content without relying on English phrase", () => {
  const multilingual = [
    "This domain is for use in documentation examples without needing permission.",
    "هذا النطاق مُخصص للاستخدام في أمثلة التوثيق دون الحاجة إلى إذن.",
    "该域名仅用于文档示例，无需获得许可。",
    "L’usage de ce domaine est réservé à des exemples de documentation,",
  ].join(" ");
  const accepted = verifySmokeEvidence(nav(), extract(multilingual));
  assert.equal(accepted.url, SMOKE_TARGET);
  assert.equal(accepted.pageStatus, 200);
  assert.ok(accepted.characters >= 100);
  assert.doesNotMatch(multilingual.toLowerCase(), /example domain/);
});
test("refuses a blank page, false successful RPC or unexpected navigation", () => {
  const content = "An intentionally long and realistic nonempty page from a real HTML test service. ".repeat(3);
  assert.throws(() => verifySmokeEvidence(nav(), extract("")), /insufficient/);
  assert.throws(() => verifySmokeEvidence(nav({status:403}), extract(content)), /HTTP 200/);
  assert.throws(() => verifySmokeEvidence(nav({url:"https://other-site.invalid/html"}), extract(content)), /exact approved/);
  assert.throws(() => verifySmokeEvidence(nav({url:SMOKE_TARGET+"?token=secret"}), extract(content)), /exact approved/);
  assert.throws(() => verifySmokeEvidence(nav(), {httpStatus:400,body:{ok:false}}), /RPC/);
  assert.throws(() => verifySmokeEvidence({httpStatus:200,body:{ok:false}}, extract(content)), /RPC/);
});
test("official HTTP test service is used rather than a documentation domain",()=>{
  assert.equal(new URL(SMOKE_TARGET).hostname, "httpbingo.org");
  assert.equal(new URL(SMOKE_TARGET).pathname, "/html");
});
