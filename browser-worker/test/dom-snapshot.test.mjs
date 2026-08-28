import test from "node:test";
import assert from "node:assert/strict";
import { MAX_INTERACTIVE_ITEMS, normaliseInteractiveItems } from "../dom-snapshot.mjs";

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
