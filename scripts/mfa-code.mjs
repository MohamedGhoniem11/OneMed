/** Print a current TOTP code for a seeded local staff account. No secrets are logged. */
import { getStore } from "../src/store/index.js";
import { generate } from "otplib";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: npm run mfa -- <uid>   (e.g. npm run mfa -- user_doctor_1)");
  process.exit(1);
}
const record = await getStore().get("userMfa", uid);
if (!record?.enabled || !record.secret) {
  console.error(`No enabled MFA record for ${uid}. Run npm run seed in the same data directory.`);
  process.exit(1);
}
console.log(await generate({ secret: record.secret }));
