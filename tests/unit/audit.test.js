import { beforeEach, describe, expect, it } from "vitest";
import { appendAudit, verifyChain } from "../../src/services/audit.service.js";
import { getStore, setStoreForTests, resetStoreForTests } from "../../src/store/index.js";
import { createLocalStore } from "../../src/store/local.store.js";

let store;

beforeEach(() => {
  resetStoreForTests();
  store = createLocalStore({ dataDir: process.env.LOCAL_DATA_DIR });
  setStoreForTests(store);
});

describe("audit hash chain", () => {
  it("appends entries with a linked SHA-256 chain and verifies", async () => {
    const first = await appendAudit({ action: "one", actorId: "u1" });
    const second = await appendAudit({ action: "two", actorId: "u1" });
    expect(second.seq).toBe(2);
    expect(second.prevHash).toBe(first.hash);
    const result = await verifyChain();
    expect(result.valid).toBe(true);
    expect(result.count).toBe(2);
  });

  it("detects tampering with an entry", async () => {
    const entry = await appendAudit({ action: "original" });
    await getStore().update("accessLog", entry.id, { action: "tampered" });
    const result = await verifyChain();
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("detects deletion of an entry as a sequence gap", async () => {
    const first = await appendAudit({ action: "first" });
    await appendAudit({ action: "second" });
    await getStore().delete("accessLog", first.id);
    const result = await verifyChain();
    expect(result.valid).toBe(false);
  });
});