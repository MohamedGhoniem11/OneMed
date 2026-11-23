import fs from "node:fs";
import admin from "firebase-admin";
import { ConfigError, env } from "./env.js";

/**
 * Lazy Firebase Admin initialization.
 *
 * Importing this module is always safe: nothing is read or initialized until a
 * Firestore/Auth operation actually needs it. Local mode never touches it.
 */

let app = null;

function loadServiceAccount() {
  if (env.hasInlineServiceAccount) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new ConfigError("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }
  }
  if (env.hasServiceAccountFile) {
    try {
      return JSON.parse(fs.readFileSync(env.credentialPath, "utf8"));
    } catch (error) {
      throw new ConfigError(`Could not read service account JSON at ${env.credentialPath}: ${error.message}`);
    }
  }
  return null;
}

export function getFirebaseApp() {
  if (app) return app;

  if (!env.firebaseConfigured) {
    throw new ConfigError(
      "Firebase was requested but no credentials are configured. Set GOOGLE_APPLICATION_CREDENTIALS, " +
        "FIREBASE_SERVICE_ACCOUNT_JSON, or an emulator host, then restart.",
    );
  }

  const options = {};
  if (env.firebaseProjectId) options.projectId = env.firebaseProjectId;

  if (!env.hasEmulator) {
    const serviceAccount = loadServiceAccount();
    if (serviceAccount) options.credential = admin.credential.cert(serviceAccount);
    // Otherwise fall back to Application Default Credentials for hosted environments.
  } else if (!options.projectId) {
    options.projectId = "demo-onemed";
  }

  app = admin.apps.length ? admin.app() : admin.initializeApp(options);
  return app;
}

export function getDb() {
  return getFirebaseApp().firestore();
}

export function getAuth() {
  return getFirebaseApp().auth();
}
