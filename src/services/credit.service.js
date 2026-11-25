import { getStore } from "../store/index.js";

const COLLECTION = "credits";
const CREDITS_PER_VERIFIED_UPLOAD = 10;

function institutionFor(user) {
  return user?.institutionId || user?.affiliation?.institutionId || user?.uid || "unassigned";
}

export async function awardForUpload(user, { resourceId } = {}) {
  if (!user || !["doctor", "lab_staff", "hospital_admin", "admin"].includes(user.role)) return null;
  const institutionId = institutionFor(user);
  const existing = await getStore().query(COLLECTION, {
    where: [{ field: "institutionId", op: "==", value: institutionId }],
    limit: 1,
  });
  const current = existing.items[0];
  const balance = (current?.balance || 0) + CREDITS_PER_VERIFIED_UPLOAD;
  const record = current
    ? await getStore().update(COLLECTION, current.id, { balance, updatedAt: new Date() })
    : await getStore().add(COLLECTION, { institutionId, balance, createdAt: new Date(), updatedAt: new Date() });
  await getStore().add(`${COLLECTION}Ledger`, {
    institutionId,
    amount: CREDITS_PER_VERIFIED_UPLOAD,
    reason: "verified_upload",
    resourceId: resourceId || null,
    createdAt: new Date(),
  });
  return record;
}

export async function creditsFor(user) {
  const institutionId = institutionFor(user);
  const { items } = await getStore().query(COLLECTION, {
    where: [{ field: "institutionId", op: "==", value: institutionId }],
    limit: 1,
  });
  return items[0] || { institutionId, balance: 0 };
}

export async function allCredits() {
  return (await getStore().query(COLLECTION, { limit: 200 })).items;
}
