import "dotenv/config";
import { admin, db } from "../src/config/firebase.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/setAdmin.js <email>");
  process.exit(1);
}

const user = await admin.auth().getUserByEmail(email);
await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
await db.collection("users").doc(user.uid).set({ role: "admin" }, { merge: true });

console.log(`${email} is now admin. Sign in again to get a new token.`);
process.exit(0);
