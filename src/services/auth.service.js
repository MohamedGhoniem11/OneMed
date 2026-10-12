import { admin, db } from "../config/firebase.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

export const register = async ({ name, email, password, phone, role }) => {
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
      name,
      email: userRecord.email,
      phone: phone ?? null,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    await admin.auth().deleteUser(userRecord.uid); // تراجع لو فشل الحفظ
    throw e;
  }

  return { id: userRecord.uid, name, email: userRecord.email, role };
};
