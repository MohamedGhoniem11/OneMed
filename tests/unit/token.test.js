import { describe, expect, it } from "vitest";
import {
  acceptConnection, createConnection, createNfc, findNfcForPatient, resolveConnection, resolveNfc, revokeNfc,
} from "../../src/services/token.service.js";
import { getStore } from "../../src/store/index.js";

describe("signed connection and NFC tokens", () => {
  it("creates, resolves and accepts a 15-minute connection token", async () => {
    const created = await createConnection({
      patientId: "patient-1", doctorId: "doctor-1", doctorName: "Dr. One",
      scope: ["records"], purpose: "Consultation",
    });
    expect(created.token.split(".")).toHaveLength(3);
    expect(created.expiresAt.getTime() - Date.now()).toBeGreaterThan(14 * 60_000);
    const record = await getStore().get("connectionTokens", created.record.id);
    expect(record.tokenHash).not.toBe(created.token);

    const resolved = await resolveConnection(created.token);
    expect(resolved.payload.doctorName).toBe("Dr. One");
    expect(resolved.record.acceptedAt).toBeNull();

    const accepted = await acceptConnection(created.token, { patientId: "patient-1" });
    expect(accepted.scope).toEqual(["records"]);
    await expect(acceptConnection(created.token, { patientId: "patient-1" })).rejects.toMatchObject({ status: 409 });
  });

  it("rejects a connection token for a different patient", async () => {
    const created = await createConnection({ patientId: "patient-2", doctorId: "doctor-1", scope: ["records"] });
    await expect(acceptConnection(created.token, { patientId: "someone-else" })).rejects.toMatchObject({ status: 403 });
  });

  it("issues an NFC token, records scans and supports revocation", async () => {
    const created = await createNfc({ patientId: "patient-3", nfcUid: "NTAG424-ABC", issuedBy: "admin-1" });
    const first = await resolveNfc(created.token);
    expect(first.patientId).toBe("patient-3");
    const second = await resolveNfc(created.token);
    expect(second.record.scanCount).toBe(2);

    const mine = await findNfcForPatient("patient-3");
    expect(mine.nfcUid).toBe("NTAG424-ABC");
    await revokeNfc(mine.id);
    await expect(resolveNfc(created.token)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects tampered tokens", async () => {
    const created = await createConnection({ patientId: "patient-4", doctorId: "doctor-1", scope: ["records"] });
    const [head, payload, signature] = created.token.split(".");
    await expect(resolveConnection(`${head}.${payload}.${signature.slice(0, -2)}xx`)).rejects.toMatchObject({ status: 400 });
  });
});
