import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";

const mocked = vi.hoisted(() => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    SMTP_HOST: "smtp.test",
    SMTP_PORT: "2525",
    SMTP_USER: "smtp-user",
    SMTP_PASSWORD: "smtp-password",
    MAIL_FROM_EMAIL: "mail@harborstone.test",
    MAIL_FROM_NAME: "Harborstone Homes",
    PUBLIC_APP_URL: "http://frontend.test",
    PUBLIC_BACKEND_URL: "http://backend.test",
  });
  const prisma = {
    $transaction: vi.fn(),
    session: { findUnique: vi.fn() },
    property: { findFirst: vi.fn() },
    subscriber: { findUnique: vi.fn(), findMany: vi.fn() },
    unsubscribeToken: { create: vi.fn() },
    campaign: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    campaignRecipient: { deleteMany: vi.fn(), createMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    deliveryAttempt: { create: vi.fn(), update: vi.fn() },
    campaignEvent: { create: vi.fn() },
    interestFollowUp: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    interest: { update: vi.fn() },
  };
  const sendMail = vi.fn();
  let transportOptions: unknown;
  const createTransport = vi.fn((options) => {
    transportOptions = options;
    return { sendMail };
  });
  return { prisma, sendMail, createTransport, getTransportOptions: () => transportOptions };
});

vi.mock("./lib/prisma.js", () => ({ prisma: mocked.prisma }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocked.createTransport } }));

import { app, mailTransport, root } from "./server.js";

async function request(path: string, init?: RequestInit) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.prisma.$transaction.mockImplementation(async (work: unknown) => Array.isArray(work) ? Promise.all(work) : (work as (tx: typeof mocked.prisma) => Promise<unknown>)(mocked.prisma));
  mocked.prisma.session.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000), user: { id: "admin-1", role: "ADMIN", email: "admin@harborstone.test" } });
  mocked.prisma.property.findFirst.mockResolvedValue({ id: "property-1" });
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("health, readiness, proxy, and GraphQL middleware", () => {
  it("returns health without requiring the database", async () => {
    const response = await request("/healthz");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("reports ready when Prisma succeeds and unavailable when it fails", async () => {
    mocked.prisma.property.findFirst.mockResolvedValueOnce({ id: "property-1" });
    expect((await request("/readyz")).status).toBe(200);
    mocked.prisma.property.findFirst.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await request("/readyz")).status).toBe(503);
  });

  it("trusts the configured proxy and mounts both GraphQL limiters", async () => {
    expect(app.get("trust proxy")).toBe(1);
    const stack = (app as unknown as { router: { stack: Array<{ name: string }> } }).router.stack;
    expect(stack.slice(3, 6).map((layer) => layer.name)).toEqual(["jsonParser", "<anonymous>", "<anonymous>"]);
    expect((await request("/healthz", { headers: { "x-forwarded-for": "203.0.113.42" } })).status).toBe(200);
  });

  it("allows the configured browser origin and keeps health outside the GraphQL limiter", async () => {
    const preflight = await request("/graphql", { method: "OPTIONS", headers: { origin: "http://frontend.test", "access-control-request-method": "POST" } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("http://frontend.test");
    expect((await request("/healthz", { headers: { "x-forwarded-for": "203.0.113.42" } })).status).toBe(200);
  });
});

describe("mocked SMTP delivery", () => {
  const currentFollowUp = {
    id: "follow-up-1", interestId: "interest-1", subject: "Your Harborstone enquiry", body: "Hello {{name}}\n{{property}}\n{{agent}}", status: "PENDING", attemptCount: 0,
    createdAt: new Date("2026-09-01T00:00:00.000Z"), sendRequestedAt: null, sentAt: null, failedAt: null,
    interest: { name: "Pat", email: "pat@example.test", property: { name: "Fixture Home" }, agent: { name: "Agent Avery" } },
  };

  beforeEach(() => {
    mocked.prisma.interestFollowUp.findUniqueOrThrow.mockResolvedValue(currentFollowUp);
    mocked.prisma.interestFollowUp.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...currentFollowUp, ...data, createdAt: currentFollowUp.createdAt, sendRequestedAt: data.sendRequestedAt ?? currentFollowUp.sendRequestedAt, sentAt: data.sentAt ?? currentFollowUp.sentAt, failedAt: data.failedAt ?? currentFollowUp.failedAt }));
    mocked.prisma.subscriber.findUnique.mockResolvedValue({ id: "subscriber-1" });
    mocked.prisma.unsubscribeToken.create.mockResolvedValue({ id: "unsubscribe-1" });
    mocked.prisma.interest.update.mockResolvedValue({ id: "interest-1" });
  });

  it("uses environment-configured SMTP port and sends follow-up email with an unsubscribe link", async () => {
    mocked.sendMail.mockResolvedValue({ messageId: "provider-message-1" });
    const result = await root.sendFollowUp({ id: "follow-up-1" }, { token: "admin-token" });

    expect(mocked.getTransportOptions()).toEqual(expect.objectContaining({ host: "smtp.test", port: 2525, secure: false, auth: { user: "smtp-user", pass: "smtp-password" } }));
    expect(mailTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "pat@example.test",
      html: expect.stringContaining("http://backend.test/unsubscribe?token="),
    }));
    expect(result.status).toBe("SENT");
    expect(mocked.prisma.interest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { followUpSent: true } }));
  });

  it("persists a failed follow-up without exposing SMTP credentials", async () => {
    mocked.sendMail.mockRejectedValue(new Error("SMTP connection refused"));
    const result = await root.sendFollowUp({ id: "follow-up-1" }, { token: "admin-token" });

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("SMTP connection refused");
    expect(JSON.stringify(result)).not.toContain("smtp-password");
  });

  it("continues campaign delivery after one SMTP failure and persists every recipient outcome", async () => {
    const campaignData = {
      id: "campaign-1", subject: "New homes", templateHtml: "<p>Homes</p>", bodyText: null, renderedHtml: null, newsArticleId: null, templateId: null, status: "DRAFT", template: null,
      properties: [], recipientCount: 2, startedAt: null, sentAt: null, completedAt: null, createdAt: new Date("2026-09-01T00:00:00.000Z"),
    };
    const subscribers = [
      { id: "subscriber-1", email: "first@example.test", name: "First" },
      { id: "subscriber-2", email: "second@example.test", name: "Second" },
    ];
    mocked.prisma.campaign.findUniqueOrThrow.mockResolvedValue(campaignData);
    mocked.prisma.subscriber.findMany.mockResolvedValue(subscribers);
    mocked.prisma.campaignRecipient.findUniqueOrThrow
      .mockResolvedValueOnce({ id: "recipient-1", attemptCount: 0 })
      .mockResolvedValueOnce({ id: "recipient-2", attemptCount: 0 });
    mocked.prisma.deliveryAttempt.create
      .mockResolvedValueOnce({ id: "attempt-1" })
      .mockResolvedValueOnce({ id: "attempt-2" });
    mocked.prisma.unsubscribeToken.create
      .mockResolvedValueOnce({ id: "unsubscribe-1" })
      .mockResolvedValueOnce({ id: "unsubscribe-2" });
    mocked.prisma.campaign.update
      .mockResolvedValueOnce({ ...campaignData, status: "QUEUED", recipients: [], properties: [] })
      .mockResolvedValueOnce({
        ...campaignData,
        status: "PARTIALLY_FAILED",
        sentAt: new Date(),
        completedAt: new Date(),
        recipients: [
          { id: "recipient-1", status: "SENT", recipientEmail: subscribers[0].email, recipientName: subscribers[0].name, attemptCount: 1, providerMessageId: "provider-1", errorMessage: null, trackingTokenHash: "hash", sentAt: new Date(), failedAt: null },
          { id: "recipient-2", status: "FAILED", recipientEmail: subscribers[1].email, recipientName: subscribers[1].name, attemptCount: 1, providerMessageId: null, errorMessage: "SMTP unavailable", trackingTokenHash: "hash", sentAt: null, failedAt: new Date() },
        ],
        events: [{ type: "SENT" }, { type: "FAILED" }],
      });
    mocked.sendMail
      .mockResolvedValueOnce({ messageId: "provider-1" })
      .mockRejectedValueOnce(new Error("SMTP unavailable"));

    const result = await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    expect(mailTransport.sendMail).toHaveBeenCalledTimes(2);
    expect(mailTransport.sendMail).toHaveBeenNthCalledWith(1, expect.objectContaining({
      to: "first@example.test",
      html: expect.stringContaining("http://backend.test/unsubscribe?token="),
    }));
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENT" }) }));
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", errorMessage: "SMTP unavailable" }) }));
    expect(mocked.prisma.deliveryAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENT" }) }));
    expect(mocked.prisma.deliveryAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }));
    expect(result.status).toBe("PARTIALLY_FAILED");
  });
});
