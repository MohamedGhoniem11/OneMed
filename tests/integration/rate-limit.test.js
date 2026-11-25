import { describe, expect, it, vi } from "vitest";

describe("Rate limiting (explicitly enabled)", () => {
  it("returns 429 once the configured request budget is exhausted", async () => {
    vi.resetModules();
    const previous = {
      disabled: process.env.RATE_LIMIT_DISABLED,
      max: process.env.EMERGENCY_RATE_LIMIT_MAX,
    };
    process.env.RATE_LIMIT_DISABLED = "false";
    process.env.EMERGENCY_RATE_LIMIT_MAX = "5";
    try {
      const express = (await import("express")).default;
      const request = (await import("supertest")).default;
      const { emergencyLimiter } = await import("../../src/middleware/rate-limit.js");
      const app = express();
      app.get("/limited", emergencyLimiter, (_req, res) => res.json({ ok: true }));
      for (let i = 0; i < 5; i += 1) await request(app).get("/limited").expect(200);
      const blocked = await request(app).get("/limited").expect(429);
      expect(blocked.body.message).toMatch(/too many requests/i);
    } finally {
      process.env.RATE_LIMIT_DISABLED = previous.disabled;
      if (previous.max === undefined) delete process.env.EMERGENCY_RATE_LIMIT_MAX;
      else process.env.EMERGENCY_RATE_LIMIT_MAX = previous.max;
      vi.resetModules();
    }
  });
});
