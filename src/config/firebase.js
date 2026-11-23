import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const keyPath = path.resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccountKey.json"
);
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export const db = admin.firestore();
export { admin };
