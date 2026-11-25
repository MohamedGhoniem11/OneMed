import { httpError } from "../utils/http-error.js";
import * as clinical from "../services/clinical.service.js";
import * as analytics from "../services/analytics.service.js";
import * as credits from "../services/credit.service.js";
import { doctorChat } from "../services/doctor-chat.service.js";

const send = (fn) => async (req, res, next) => {
  try { res.json(await fn(req)); } catch (error) { next(error); }
};

function requirePatient(req) {
  const id = req.params.patientId || req.query.patientId;
  if (!id) throw httpError(400, "patientId is required");
  return id;
}

export const summary = send((req) => clinical.clinicalSummary(req, requirePatient(req)));
export const patient = send((req) => analytics.patientAnalytics(req, requirePatient(req)));
export const population = send(() => analytics.populationAnalytics());
export const chat = send(async (req) => doctorChat(req, req.params.patientId, req.body?.message, req.body?.language || "en"));

export const creditBalance = send(async (req) => {
  if (!["doctor", "lab_staff", "hospital_admin", "admin"].includes(req.user?.role)) throw httpError(403, "Forbidden");
  return credits.creditsFor(req.user);
});

export const creditLedger = send(async (req) => {
  if (!["admin", "hospital_admin"].includes(req.user?.role)) throw httpError(403, "Forbidden");
  const { getStore } = await import("../store/index.js");
  const { items } = await getStore().query("creditsLedger", { limit: 500 });
  const balance = ["admin"].includes(req.user?.role)
    ? await credits.allCredits()
    : await credits.creditsFor(req.user);
  return { ledger: items, balance };
});
