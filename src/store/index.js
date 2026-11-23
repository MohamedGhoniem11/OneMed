import { env } from "../config/env.js";
import { createFirestoreStore } from "./firestore.store.js";
import { createLocalStore } from "./local.store.js";

let instance = null;

export function getStore() {
  if (!instance) {
    instance =
      env.persistence === "firestore"
        ? createFirestoreStore()
        : createLocalStore({ dataDir: env.localDataDir });
  }
  return instance;
}

/** Test hook: replace the singleton with an isolated store. */
export function setStoreForTests(store) {
  instance = store;
}

/** Test hook: drop the singleton so the next getStore() re-reads config. */
export function resetStoreForTests() {
  instance = null;
}

export { createLocalStore };
