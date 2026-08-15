import test from "node:test";
import assert from "node:assert/strict";
import {
  bearerAuthorised,
  cleanAllowedDomains,
  domainAllowed,
  isPrivateIp,
  safeSelector,
  safeText,
} from "../policy.mjs";

test("normalises and bounds allowed domains", () => {
  assert.deepEqual(cleanAllowedDomains(["WWW.Example.com", "example.com", "docs.example.com"]), ["example.com", "docs.example.com"]);
});

test("allows exact domains and subdomains only", () => {
  assert.equal(domainAllowed("example.com", ["example.com"]), true);
  assert.equal(domainAllowed("docs.example.com", ["example.com"]), true);
  assert.equal(domainAllowed("example.com.evil.test", ["example.com"]), false);
});

test("detects private IPv4 and IPv6 ranges", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.1.1", "192.168.0.2", "169.254.1.1", "::1", "fd00::1"]) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.equal(isPrivateIp("1.1.1.1"), false);
});

test("requires an exact bearer worker token", () => {
  assert.equal(bearerAuthorised({ authorization: "Bearer secret" }, "secret"), true);
  assert.equal(bearerAuthorised({ authorization: "Bearer other" }, "secret"), false);
  assert.equal(bearerAuthorised({}, ""), false);
});

test("bounds model-controlled selectors and text", () => {
  assert.equal(safeSelector(" #submit "), "#submit");
  assert.throws(() => safeSelector(""), /selector/i);
  assert.equal(safeText("abcdef", 3), "abc");
});
