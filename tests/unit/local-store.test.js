import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "../../src/store/local.store.js";

let dir;
let store;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "onemed-store-"));
  store = createLocalStore({ dataDir: dir });
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("local persistence store", () => {
  it("writes, reads, merges, and deletes documents", async () => {
    const created = await store.set("users", "u1", { name: "Mona", role: "patient" });
    expect(created).toMatchObject({ id: "u1", name: "Mona" });

    const merged = await store.set("users", "u1", { phone: "01012345678" }, { merge: true });
    expect(merged).toMatchObject({ id: "u1", name: "Mona", phone: "01012345678" });

    expect(await store.get("users", "u1")).toMatchObject({ name: "Mona" });
    expect(await store.get("users", "missing")).toBeNull();

    expect(await store.delete("users", "u1")).toBe(true);
    expect(await store.delete("users", "u1")).toBe(false);
    expect(await store.get("users", "u1")).toBeNull();
  });

  it("adds documents with generated ids and persists across instances", async () => {
    const created = await store.add("prescriptions", { patientId: "p1", status: "confirmed" });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);

    const reopened = createLocalStore({ dataDir: dir });
    expect(await reopened.get("prescriptions", created.id)).toMatchObject({
      patientId: "p1",
      status: "confirmed",
    });
  });

  it("filters, sorts, paginates, and returns a cursor", async () => {
    await store.set("prescriptions", "a", { doctorId: "d1", createdAt: "2026-01-01T00:00:00.000Z" });
    await store.set("prescriptions", "b", { doctorId: "d1", createdAt: "2026-01-03T00:00:00.000Z" });
    await store.set("prescriptions", "c", { doctorId: "d2", createdAt: "2026-01-02T00:00:00.000Z" });
    await store.set("prescriptions", "d", { doctorId: "d1", createdAt: "2026-01-04T00:00:00.000Z" });

    const page1 = await store.query("prescriptions", {
      where: [{ field: "doctorId", op: "==", value: "d1" }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 2,
    });
    expect(page1.items.map((item) => item.id)).toEqual(["d", "b"]);
    expect(page1.nextCursor).toBe("b");

    const page2 = await store.query("prescriptions", {
      where: [{ field: "doctorId", op: "==", value: "d1" }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 2,
      startAfter: page1.nextCursor,
    });
    expect(page2.items.map((item) => item.id)).toEqual(["a"]);
    expect(page2.nextCursor).toBeNull();
  });

  it("converts Date values to ISO strings on write", async () => {
    const when = new Date("2026-02-03T04:05:06.000Z");
    const doc = await store.set("users", "u2", { createdAt: when });
    expect(doc.createdAt).toBe("2026-02-03T04:05:06.000Z");
  });

  it("refuses to overwrite a corrupt database file", async () => {
    fs.writeFileSync(path.join(dir, "local-db.json"), "{ not json");
    await expect(createLocalStore({ dataDir: dir }).get("users", "u1")).rejects.toThrow(/not valid JSON/);
  });

  it("throws 404 when updating a missing document", async () => {
    await expect(store.update("users", "nobody", { name: "X" })).rejects.toMatchObject({ status: 404 });
  });
});
