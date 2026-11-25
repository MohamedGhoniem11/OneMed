import * as service from "../services/notification.service.js";
import { registerToken } from "../services/fcm.service.js";

const send = (fn) => async (req, res, next) => {
  try { res.json(await fn(req)); } catch (error) { next(error); }
};

export const registerDevice = send(async (req) => registerToken(req.user.uid, req.body?.token, req.body?.platform || "web"));
export const list = send(async (req) => service.listForUser(req.user.uid));
export const markAll = send((req) => service.markAllRead(req.user.uid));
export const markOne = send((req) => service.markRead(req.user.uid, req.params.id));
