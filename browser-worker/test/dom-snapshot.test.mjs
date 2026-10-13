import test from "node:test";
import assert from "node:assert/strict";
import { MAX_INTERACTIVE_ITEMS, normaliseInteractiveItems, safeObservedLink } from "../dom-snapshot.mjs";

test("normaliseInteractiveItems returns bounded safe page controls without field values", () => {
  const raw = [
    {
      selector: "#email",
      tag: "INPUT",
      type: "email",
      label: "Email address",
      value: "private@example.com",
      disabled: false,
    },
    {
      selector: "button[data-testid=submit]",
      tag: "BUTTON",
      role: "button",
      text: "  Submit   order  ",
      disabled: true,
    },
  ];

  const items = normaliseInteractiveItems(raw);
  assert.deepEqual(items, [
    {
      selector: "#email",
      tag: "input",
      type: "email",
      label: "Email address",
      disabled: false,
    },
    {
      selector: "button[data-testid=submit]",
      tag: "button",
      role: "button",
      text: "Submit order",
      disabled: true,
    },
  ]);
  assert.equal("value" in items[0], false);
});

test("normaliseInteractiveItems deduplicates selectors and enforces the hard item cap", () => {
  const raw = Array.from({ length: MAX_INTERACTIVE_ITEMS + 30 }, (_, index) => ({
    selector: `#item-${index}`,
    tag: "button",
    text: `Item ${index}`,
  }));
  raw.splice(1, 0, { selector: "#item-0", tag: "button", text: "duplicate" });

  const items = normaliseInteractiveItems(raw);
  assert.equal(items.length, MAX_INTERACTIVE_ITEMS);
  assert.equal(items.filter((item) => item.selector === "#item-0").length, 1);
});

test("model-visible browser snapshots never disclose signed links, secrets or form values", () => {
  const data = normaliseInteractiveItems([
    {selector:"#continue",tag:"a",href:"https://example.com/orders?session_token=top-secret#secret-fragment",text:"Continue"},
    {selector:"#reset",tag:"a",href:"https://example.com/reset-password/raw-reset-secret?code=secret",text:"Reset"},
    {selector:"#bad",tag:"a",href:"javascript:alert(1)"},
    {selector:"#auth",tag:"a",href:"https://user:password@example.com/private"},
    {selector:"#password",tag:"input",type:"password",value:"raw-password",label:"Password"},
  ]);
  assert.equal(data[0].href, "https://example.com/orders");
  assert.equal(data[1].href, "https://example.com");
  assert.equal("href" in data[2], false);
  assert.equal("href" in data[3], false);
  assert.equal("value" in data[4], false);
  assert.equal(JSON.stringify(data).includes("top-secret"), false);
  assert.equal(safeObservedLink("data:text/html,hello"), "");
  assert.equal(safeObservedLink("https://example.com/catalog#access=secret"), "https://example.com/catalog");
});
