import test from "node:test";
import assert from "node:assert/strict";
import {
  createBrowserSessionGate,
  BrowserSessionCapacityError,
  BrowserSessionBusyError,
} from "../session-governance.mjs";

test("concurrent browser session creations cannot overrun the configured budget", () => {
  const gate = createBrowserSessionGate(2);
  const first = gate.reserveCreate(0);
  assert.equal(gate.status(0).availableSlots, 1);
  const second = gate.reserveCreate(0);
  assert.equal(gate.status(0).creatingSessions, 2);
  assert.throws(() => gate.reserveCreate(0), BrowserSessionCapacityError);
  // A newly established session occupies one slot even after reservation release.
  first();
  first();
  assert.equal(gate.status(1).availableSlots, 0);
  second();
  assert.equal(gate.status(1).availableSlots, 1);
  const next = gate.reserveCreate(1);
  assert.throws(() => gate.reserveCreate(1), BrowserSessionCapacityError);
  next();
  assert.equal(gate.status(1).creatingSessions, 0);
});
test("failed asynchronous setup releases the leased browser slot", async () => {
  const gate = createBrowserSessionGate(1);
  const creation = async () => {
    const release = gate.reserveCreate(0);
    try { throw new Error("Chromium context startup failed"); }
    finally { release(); }
  };
  await assert.rejects(creation(), /Chromium context startup failed/);
  assert.equal(gate.status(0).availableSlots, 1);
});
test("only one action can operate on a given browser session at a time", () => {
  const gate = createBrowserSessionGate(3);
  const releaseA = gate.acquire("session-A");
  assert.equal(gate.isActive("session-A"), true);
  assert.throws(() => gate.acquire("session-A"), BrowserSessionBusyError);
  const releaseB = gate.acquire("session-B");
  assert.equal(gate.status(2).busySessions, 2);
  releaseA();
  releaseA();
  assert.equal(gate.isActive("session-A"), false);
  const again = gate.acquire("session-A");
  assert.equal(gate.status(2).busySessions, 2);
  again();
  releaseB();
  assert.equal(gate.status(2).busySessions, 0);
});
test("invalid budgets and browser session IDs fail closed", () => {
  assert.throws(() => createBrowserSessionGate(0));
  assert.throws(() => createBrowserSessionGate(NaN));
  const gate = createBrowserSessionGate(1);
  assert.throws(() => gate.reserveCreate(-1));
  assert.throws(() => gate.acquire(""));
});
