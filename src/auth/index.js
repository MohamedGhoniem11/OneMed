import { env } from "../config/env.js";
import { createFirebaseIdp } from "./firebase.idp.js";
import { createLocalIdp } from "./local.idp.js";

let instance = null;

export function getIdp() {
  if (!instance) {
    instance = env.authProvider === "firebase" ? createFirebaseIdp() : createLocalIdp();
  }
  return instance;
}

export function resetIdpForTests() {
  instance = null;
}
