import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../../src/middleware/error.js";
import { requestId } from "../../src/middleware/request-id.js";
import { httpError } from "../../src/utils/http-error.js";

function buildApp() {
  const app = express();
  app.use(requestId);
  app.get("/ok", (req, res) => res.json({ requestId: req.id }));
  app.get("/bad", (req, res, next) => next(httpError(400, "helpful validation message")));
  app.get("/boom", () => {
    throw new Error("super-secret internal detail");
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe("error handling", () => {
  it("returns a correlation id and echoes a safe client id", async () => {
    const app = buildApp();
    const generated = await request(app).get("/ok").expect(200);
    expect(generated.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);

    const supplied = await request(app).get("/ok").set("X-Request-Id", "client-123").expect(200);
    expect(supplied.body.requestId).toBe("client-123");
    expect(supplied.headers["x-request-id"]).toBe("client-123");
  });

  it("keeps actionable 4xx messages", async () => {
    const app = buildApp();
    const response = await request(app).get("/bad").expect(400);
    expect(response.body).toMatchObject({ message: "helpful validation message" });
    expect(response.body.requestId).toBeTruthy();
  });

  it("sanitizes 5xx errors and logs them with the request id", async () => {
    const app = buildApp();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await request(app).get("/boom").set("X-Request-Id", "trace-500").expect(500);
    expect(response.body).toEqual({ message: "Internal Server Error", requestId: "trace-500" });
    expect(JSON.stringify(response.body)).not.toContain("super-secret");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[trace-500]"), expect.any(Error));
  });

  it("returns a JSON 404", async () => {
    const app = buildApp();
    const response = await request(app).get("/nope").expect(404);
    expect(response.body.message).toContain("not found");
  });
});
