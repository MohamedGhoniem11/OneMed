import { admin, db } from "../config/firebase.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

export async function register({ name, email, password, role, phone }) {
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({ email, password, displayName: name });
  } catch (e) {
    if (e.code === "auth/email-already-exists") throw httpError(409, "Email already exists");
    if (e.code === "auth/invalid-email" || e.code === "auth/invalid-password")
      throw httpError(400, e.message);
    throw e;
  }

  try {
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    await db.collection("users").doc(userRecord.uid).set({
      name, email, phone, role, createdAt: new Date(),
    });
  } catch (e) {
    await admin.auth().deleteUser(userRecord.uid); // rollback
    throw e;
  }

  // دخول تلقائي
  const customToken = await admin.auth().createCustomToken(userRecord.uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const auth = await r.json();

  return {
    id: userRecord.uid,
    name, email, phone, role,
    idToken: r.ok ? auth.idToken : null,
    refreshToken: r.ok ? auth.refreshToken : null,
  };
}