import * as orders from "../services/fulfillment.service.js";
import { getForUser, listNearby, updateProfile } from "../services/pharmacy.service.js";
import { httpError } from "../utils/http-error.js";

const send = (fn) => async (req, res, next) => {
  try { res.json(await fn(req)); } catch (error) { next(error); }
};

export const ordersList = send(async (req) => ({ orders: await orders.ordersFor(req.user) }));
export const advance = send((req) => orders.advanceOrder(req.params.id, req.user, req));
export const cancel = send((req) => orders.cancelOrder(req.params.id, req.user, req));

export const profile = send(async (req) => {
  const pharmacy = await getForUser(req.user);
  if (!pharmacy) throw httpError(404, "Pharmacy profile not found");
  return pharmacy;
});

export const nearby = send(async (req) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) throw httpError(400, "lat and lng are required");
  return { pharmacies: await listNearby({ lat: Number(lat), lng: Number(lng) }) };
});

export const update = send(async (req) => {
  const pharmacy = await getForUser(req.user);
  if (!pharmacy) throw httpError(404, "Pharmacy profile not found");
  const { id: _ignored, ...patch } = req.body || {};
  return updateProfile(pharmacy.id, patch);
});
