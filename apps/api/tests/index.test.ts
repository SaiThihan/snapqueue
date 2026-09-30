import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, computeJobId, isValidUrl } from "../src/index.js";

// These hit a real Redis (see infra/docker-compose.yml) — this project tests
// against real infrastructure throughout, not mocks, so these prove the same
// thing curl-against-a-running-server would.

describe("computeJobId", () => {
  it("is deterministic — same url+viewport always hashes the same", () => {
    const a = computeJobId("https://example.com", "desktop");
    const b = computeJobId("https://example.com", "desktop");
    expect(a).toBe(b);
  });

  it("differs when either url or viewport differs", () => {
    const base = computeJobId("https://example.com", "desktop");
    expect(computeJobId("https://example.com", "mobile")).not.toBe(base);
    expect(computeJobId("https://example.org", "desktop")).not.toBe(base);
  });

  it("is prefixed with shot_ so an all-numeric hash can never violate BullMQ's jobId rules", () => {
    expect(computeJobId("https://example.com", "desktop")).toMatch(/^shot_/);
  });
});

describe("isValidUrl", () => {
  it("accepts http/https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("rejects a URL missing its protocol scheme", () => {
    expect(isValidUrl("www.example.com")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("POST /screenshots", () => {
  it("rejects a malformed url with 400, before it ever becomes a job", async () => {
    const res = await request(app)
      .post("/screenshots")
      .send({ url: "not-a-url", viewport: "desktop" });

    expect(res.status).toBe(400);
  });

  it("rejects an unknown viewport with 400", async () => {
    const res = await request(app)
      .post("/screenshots")
      .send({ url: "https://example.com", viewport: "wide-screen" });

    expect(res.status).toBe(400);
  });

  it("accepts a valid request and returns a jobId", async () => {
    const url = `https://example.com/test-${Date.now()}`;

    const res = await request(app)
      .post("/screenshots")
      .send({ url, viewport: "desktop" });

    expect(res.status).toBe(202);
    expect(res.body.jobId).toMatch(/^shot_/);
  });

  it("dedups — the same url+viewport twice returns the same jobId", async () => {
    const url = `https://example.com/test-${Date.now()}`;
    const body = { url, viewport: "desktop" };

    const first = await request(app).post("/screenshots").send(body);
    const second = await request(app).post("/screenshots").send(body);

    expect(second.body.jobId).toBe(first.body.jobId);
  });
});

describe("GET /screenshots/:id", () => {
  it("returns 404 for a jobId that was never created", async () => {
    const res = await request(app).get("/screenshots/shot_does_not_exist");
    expect(res.status).toBe(404);
  });
});
