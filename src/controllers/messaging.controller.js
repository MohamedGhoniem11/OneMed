import * as service from "../services/messaging.service.js";
import { auditRequest } from "../services/audit.service.js";

const send = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json(await fn(req)); } catch (error) { next(error); }
};

export const listConversations = send(async (req) => ({ conversations: await service.listConversations(req.user) }));
export const createConversation = send(async (req) => service.createConversation(req.body, req.user), 201);
export const listMessages = send(async (req) => ({ messages: await service.listMessages(req.params.id, req.user) }));
export const sendMessage = send(async (req) => service.sendMessage(req.params.id, req.body, req.user), 201);
export const hideConversation = send(async (req) => {
  const result = await service.hideConversation(req.params.id, req.user);
  await auditRequest(req, {
    action: "conversation_hidden", resourceType: "conversation", resourceId: result.id,
  });
  return result;
});
