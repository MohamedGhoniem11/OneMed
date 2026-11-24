import * as service from "../services/audit.service.js";

export async function list(req, res, next) {
  try {
    const page = await service.listAudit({ limit: req.query.limit, startAfter: req.query.startAfter });
    res.json({ auditLog: page.items, nextCursor: page.nextCursor });
  } catch (err) {
    next(err);
  }
}

export async function verify(req, res, next) {
  try {
    res.json(await service.verifyChain());
  } catch (err) {
    next(err);
  }
}