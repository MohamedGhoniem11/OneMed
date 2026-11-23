import "dotenv/config";
import { getIdp } from "../src/auth/index.js";
import { getStore } from "../src/store/index.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/setAdmin.js <email>");
  process.exit(1);
}

const authUser = await getIdp().getUserByEmail(email);
if (!authUser) {
  console.error(`No account found for ${email}. Register first, then run this script.`);
  process.exit(1);
}

await getIdp().setCustomUserClaims(authUser.uid, { role: "admin" });
const profile = await getStore().get("users", authUser.uid);
if (profile) {
  await getStore().update("users", authUser.uid, { role: "admin", updatedAt: new Date() });
} else {
  console.warn(`Account ${email} has no users/{uid} profile; only the role claim was updated.`);
}

console.log(`${email} is now admin. Sign in again to get a token with the new role.`);
process.exit(0);
