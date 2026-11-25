import * as service from "../services/fulfillment.service.js";

const send = (fn) => async (req, res, next) => {
  try { res.json(await fn(req)); } catch (error) { next(error); }
};

export const profile = send((req) => service.publicPrescription(req.params.token, req));
export const select = send((req) => service.selectPharmacy(req.params.token, req.body.pharmacyId, req));
