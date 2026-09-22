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
    subscriber: { count: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    unsubscribeToken: { create: vi.fn() },
    campaign: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    campaignRecipient: { deleteMany: vi.fn(), createMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    deliveryAttempt: { create: vi.fn(), update: vi.fn() },
    campaignEvent: { create: vi.fn(), upsert: vi.fn() },
    interestFollowUp: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    interest: { update: vi.fn() },
  };
  const sendMail = vi.fn();
  const verify = vi.fn();
  let transportOptions: unknown;
  const createTransport = vi.fn((options) => {
    transportOptions = options;
    return { sendMail, verify };
  });
  return { prisma, sendMail, verify, createTransport, getTransportOptions: () => transportOptions };
});

vi.mock("./lib/prisma.js", () => ({ prisma: mocked.prisma }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocked.createTransport } }));

import { app, mailTransport, root, verifyMailTransport } from "./server.js";

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
  mocked.prisma.campaignRecipient.findUnique.mockResolvedValue(null);
  mocked.verify.mockResolvedValue(true);
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
    expect(stack.map((layer) => layer.name)).toEqual(expect.arrayContaining(["jsonParser", "<anonymous>", "<anonymous>"]));
    expect((await request("/healthz", { headers: { "x-forwarded-for": "203.0.113.42" } })).status).toBe(200);
  });

  it("allows the configured browser origin and keeps health outside the GraphQL limiter", async () => {
    const preflight = await request("/graphql", { method: "OPTIONS", headers: { origin: "http://frontend.test", "access-control-request-method": "POST" } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("http://frontend.test");
    expect((await request("/healthz", { headers: { "x-forwarded-for": "203.0.113.42" } })).status).toBe(200);
  });
  it("does not expose the retired campaign open endpoint", async () => {
    expect((await request("/campaign-open/secure-token")).status).toBe(404);
    expect(mocked.prisma.campaignEvent.upsert).not.toHaveBeenCalled();
  });
});

describe("mocked SMTP delivery", () => {
  const currentFollowUp = {
    id: "follow-up-1", interestId: "interest-1", subject: "Your Harborstone enquiry", body: "Hello {{name}}\n{{property}}\n{{agent}}", status: "PENDING", attemptCount: 0,
    createdAt: new Date("2026-09-01T00:00:00.000Z"), sendRequestedAt: null, sentAt: null, failedAt: null,
    interest: { name: "Pat", email: "pat@example.test", property: { name: "Fixture Home" }, agent: { name: "Agent Avery" } },
  };

  function configureSingleRecipientCampaign(finalStatus: "SENT" | "FAILED", errorMessage: string | null = null) {
    const campaignData = {
      id: "campaign-1", subject: "New homes", templateHtml: "<p>Hello {{Name}}</p>{{properties}}", bodyText: null, renderedHtml: null, newsArticleId: null, templateId: null, status: "DRAFT", template: null,
      properties: [{ property: { id: "property-1", name: "Fixture home", location: null, priceMin: null, priceMax: null, type: null, bedroomsMin: null, sizeSqm: null, media: [] } }], recipientCount: 1, startedAt: null, sentAt: null, completedAt: null, createdAt: new Date("2026-09-01T00:00:00.000Z"),
    };
    const recipient = { id: "subscriber-1", email: "eligible@example.test", name: "Eligible" };
    mocked.prisma.campaign.findUniqueOrThrow.mockResolvedValue(campaignData);
    mocked.prisma.subscriber.findMany.mockResolvedValue([recipient]);
    mocked.prisma.campaignRecipient.findUniqueOrThrow.mockResolvedValue({ id: "recipient-1", attemptCount: 0 });
    mocked.prisma.deliveryAttempt.create.mockResolvedValue({ id: "attempt-1" });
    mocked.prisma.unsubscribeToken.create.mockResolvedValue({ id: "unsubscribe-1" });
    mocked.prisma.campaign.update
      .mockResolvedValueOnce({ ...campaignData, status: "QUEUED", recipients: [], properties: [] })
      .mockResolvedValueOnce({
        ...campaignData,
        status: finalStatus,
        sentAt: finalStatus === "SENT" ? new Date() : null,
        completedAt: new Date(),
        recipients: [{ id: "recipient-1", status: finalStatus, recipientEmail: recipient.email, recipientName: recipient.name, attemptCount: 1, providerMessageId: finalStatus === "SENT" ? "provider-1" : null, errorMessage, sentAt: finalStatus === "SENT" ? new Date() : null, failedAt: finalStatus === "FAILED" ? new Date() : null }],
        events: [{ type: finalStatus }],
      });
    return { campaignData, recipient };
  }

  beforeEach(() => {
    mocked.prisma.interestFollowUp.findUniqueOrThrow.mockResolvedValue(currentFollowUp);
    mocked.prisma.interestFollowUp.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...currentFollowUp, ...data, createdAt: currentFollowUp.createdAt, sendRequestedAt: data.sendRequestedAt ?? currentFollowUp.sendRequestedAt, sentAt: data.sentAt ?? currentFollowUp.sentAt, failedAt: data.failedAt ?? currentFollowUp.failedAt }));
    mocked.prisma.subscriber.findUnique.mockResolvedValue({ id: "subscriber-1" });
    mocked.prisma.unsubscribeToken.create.mockResolvedValue({ id: "unsubscribe-1" });
    mocked.prisma.interest.update.mockResolvedValue({ id: "interest-1" });
  });

  it("uses Sample Recipient only for campaign previews", async () => {
    mocked.prisma.campaign.findUniqueOrThrow.mockResolvedValue({
      id: "campaign-1", subject: "New homes", templateHtml: "<p>Hello {{Name}}</p>", template: null, properties: [],
    });
    mocked.prisma.subscriber.count.mockResolvedValue(1);

    const preview = await root.campaignPreview({ id: "campaign-1" }, { token: "admin-token" });

    expect(preview.html).toContain("Hello Sample Recipient");
  });

  it("uses environment-configured SMTP port and sends follow-up email with an unsubscribe link", async () => {
    mocked.sendMail.mockResolvedValue({ messageId: "provider-message-1", accepted: ["pat@example.test"], rejected: [], response: "250 accepted" });
    const result = await root.sendFollowUp({ id: "follow-up-1" }, { token: "admin-token" });

    expect(mocked.getTransportOptions()).toEqual(expect.objectContaining({ host: "smtp.test", port: 2525, secure: false, auth: { user: "smtp-user", pass: "smtp-password" } }));
    expect(mailTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Harborstone Homes <mail@harborstone.test>",
      to: "pat@example.test",
      subject: "Your Harborstone enquiry",
      html: expect.stringContaining("http://backend.test/unsubscribe?token="),
    }));
    expect(result.status).toBe("SENT");
    expect(mocked.prisma.interest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { followUpSent: true } }));
  });

  it("verifies the configured SMTP transport without sending mail", async () => {
    await expect(verifyMailTransport()).resolves.toBe(true);
    expect(mocked.verify).toHaveBeenCalledTimes(1);
    expect(mocked.sendMail).not.toHaveBeenCalled();
  });

  it("persists a failed follow-up without exposing SMTP credentials", async () => {
    mocked.sendMail.mockRejectedValue(new Error("SMTP connection refused"));
    const result = await root.sendFollowUp({ id: "follow-up-1" }, { token: "admin-token" });

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("SMTP connection refused");
    expect(JSON.stringify(result)).not.toContain("smtp-password");
  });

  it("persists a failed follow-up when the mail server rejects its recipient", async () => {
    mocked.sendMail.mockResolvedValue({ messageId: "provider-message-1", accepted: [], rejected: ["pat@example.test"], response: "550 rejected" });
    const result = await root.sendFollowUp({ id: "follow-up-1" }, { token: "admin-token" });

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("Mail server rejected the recipient");
    expect(mocked.prisma.interest.update).not.toHaveBeenCalled();
  });

  it("sends only active consented recipients and awaits provider delivery confirmation", async () => {
    const campaignData = {
      id: "campaign-1", subject: "New homes", templateHtml: "<p>Hello {{Name}}</p>{{properties}}", bodyText: null, renderedHtml: null, newsArticleId: null, templateId: null, status: "DRAFT", template: null,
      properties: [{ property: { id: "property-1", name: "Fixture home", location: null, priceMin: null, priceMax: null, type: null, bedroomsMin: null, sizeSqm: null, media: [] } }], recipientCount: 1, startedAt: null, sentAt: null, completedAt: null, createdAt: new Date("2026-09-01T00:00:00.000Z"),
    };
    const recipient = { id: "subscriber-1", email: "eligible@example.test", name: "Alice Murphy" };
    mocked.prisma.campaign.findUniqueOrThrow.mockResolvedValue(campaignData);
    mocked.prisma.subscriber.findMany.mockResolvedValue([recipient]);
    mocked.prisma.campaignRecipient.findUniqueOrThrow.mockResolvedValue({ id: "recipient-1", attemptCount: 0 });
    mocked.prisma.deliveryAttempt.create.mockResolvedValue({ id: "attempt-1" });
    mocked.prisma.unsubscribeToken.create.mockResolvedValue({ id: "unsubscribe-1" });
    mocked.prisma.campaign.update
      .mockResolvedValueOnce({ ...campaignData, status: "QUEUED", recipients: [], properties: [] })
      .mockResolvedValueOnce({
        ...campaignData,
        status: "SENDING",
        sentAt: new Date(),
        completedAt: new Date(),
        recipients: [{ id: "recipient-1", status: "SENDING", recipientEmail: recipient.email, recipientName: recipient.name, attemptCount: 1, providerMessageId: "provider-1", errorMessage: null, sentAt: new Date(), failedAt: null }],
        events: [],
      });
    mocked.sendMail.mockResolvedValue({ messageId: "provider-1", accepted: [recipient.email], rejected: [], response: "250 accepted" });

    const result = await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    expect(mocked.prisma.subscriber.findMany).toHaveBeenCalledWith({ where: { status: "ACTIVE", consentGrantedAt: { not: null } }, select: { id: true, email: true, name: true } });
    expect(mailTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Harborstone Homes <mail@harborstone.test>",
      to: "eligible@example.test",
      subject: "New homes",
      html: expect.stringMatching(/http:\/\/backend\.test\/unsubscribe\?token=/),
    }));
    const email = vi.mocked(mailTransport.sendMail).mock.calls[0][0];
    expect(email.html).toContain("Hello Alice Murphy");
    expect(email.html).not.toContain("Sample Recipient");
    expect(email.html).not.toMatch(/\{\{\s*name\s*\}\}/i);
    expect(email.html).toContain("/campaign-click?token=");
    expect(email.html).not.toContain("/campaign-open/");
    expect(email.html).not.toMatch(/<img[^>]+campaign-open/);
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENDING" }) }));
    expect(result.status).toBe("SENDING");
    expect(result.sentCount).toBe(0);
    expect(result.awaitingDeliveryCount).toBe(1);
  });

  it("persists a failed recipient when SMTP resolves with a rejected address", async () => {
    const { recipient } = configureSingleRecipientCampaign("FAILED", "Mail server rejected the recipient");
    mocked.sendMail.mockResolvedValue({ messageId: "provider-1", accepted: [], rejected: [recipient.email], response: "550 rejected" });

    const result = await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    expect(result.status).toBe("FAILED");
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", errorMessage: "Mail server rejected the recipient" }) }));
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", errorMessage: "Mail server rejected the recipient" }) }));
  });

  it("uses a neutral fallback instead of a preview name for a blank recipient name", async () => {
    const { recipient } = configureSingleRecipientCampaign("SENT");
    recipient.name = "   ";
    mocked.sendMail.mockResolvedValue({ messageId: "provider-1", accepted: [recipient.email], rejected: [], response: "250 accepted" });

    await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    const email = vi.mocked(mailTransport.sendMail).mock.calls[0][0];
    expect(email.html).toContain("Hello there");
    expect(email.html).not.toContain("Sample Recipient");
  });

  it("persists a failed recipient when SMTP resolves without accepting the address", async () => {
    configureSingleRecipientCampaign("FAILED", "Mail server did not confirm recipient acceptance");
    mocked.sendMail.mockResolvedValue({ messageId: "provider-1", accepted: [], rejected: [], response: "250 queued" });

    const result = await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    expect(result.status).toBe("FAILED");
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(mocked.prisma.campaignEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "FAILED" }) }));
  });

  it("fails a campaign with no eligible recipients without attempting SMTP delivery", async () => {
    const campaignData = { id: "campaign-1", subject: "New homes", templateHtml: "<p>Homes</p>", bodyText: null, renderedHtml: null, newsArticleId: null, templateId: null, status: "DRAFT", template: null, properties: [], recipientCount: 0, startedAt: null, sentAt: null, completedAt: null, createdAt: new Date("2026-09-01T00:00:00.000Z") };
    mocked.prisma.campaign.findUniqueOrThrow.mockResolvedValue(campaignData);
    mocked.prisma.subscriber.findMany.mockResolvedValue([{ id: "invalid-subscriber", email: "not-an-email", name: "Invalid" }]);
    mocked.prisma.campaign.update.mockResolvedValue({ ...campaignData, status: "FAILED", completedAt: new Date(), recipients: [], events: [] });

    const result = await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    expect(result.status).toBe("FAILED");
    expect(result.recipientCount).toBe(0);
    expect(result.sentCount).toBe(0);
    expect(mocked.sendMail).not.toHaveBeenCalled();
  });

  it("continues campaign delivery after one SMTP failure and persists every recipient outcome", async () => {
    const campaignData = {
      id: "campaign-1", subject: "New homes", templateHtml: "<p>Hello {{Name}}</p>", bodyText: null, renderedHtml: null, newsArticleId: null, templateId: null, status: "DRAFT", template: null,
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
        status: "SENDING",
        sentAt: new Date(),
        completedAt: new Date(),
        recipients: [
          { id: "recipient-1", status: "FAILED", recipientEmail: subscribers[0].email, recipientName: subscribers[0].name, attemptCount: 1, providerMessageId: null, errorMessage: "SMTP unavailable", trackingTokenHash: "hash", sentAt: null, failedAt: new Date() },
          { id: "recipient-2", status: "SENDING", recipientEmail: subscribers[1].email, recipientName: subscribers[1].name, attemptCount: 1, providerMessageId: "provider-1", errorMessage: null, trackingTokenHash: "hash", sentAt: new Date(), failedAt: null },
        ],
        events: [{ type: "FAILED" }],
      });
    mocked.sendMail
      .mockRejectedValueOnce(new Error("SMTP unavailable"))
      .mockResolvedValueOnce({ messageId: "provider-1", accepted: [subscribers[1].email], rejected: [], response: "250 accepted" });

    const result = await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    expect(mailTransport.sendMail).toHaveBeenCalledTimes(2);
    expect(mailTransport.sendMail).toHaveBeenNthCalledWith(1, expect.objectContaining({
      to: "first@example.test",
      html: expect.stringContaining("http://backend.test/unsubscribe?token="),
    }));
    expect(mailTransport.sendMail).toHaveBeenNthCalledWith(2, expect.objectContaining({ to: "second@example.test" }));
    const deliveryHtml = vi.mocked(mailTransport.sendMail).mock.calls.map(([message]) => message.html);
    expect(deliveryHtml).toEqual(expect.arrayContaining([expect.stringContaining("Hello First"), expect.stringContaining("Hello Second")]));
    expect(deliveryHtml.every((html) => !html.includes("Sample Recipient"))).toBe(true);
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENDING" }) }));
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", errorMessage: "SMTP unavailable" }) }));
    expect(mocked.prisma.deliveryAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENDING" }) }));
    expect(mocked.prisma.deliveryAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }));
    expect(result.status).toBe("SENDING");
  });

  it("marks a campaign partially failed when two recipients are accepted and one is rejected", async () => {
    const campaignData = {
      id: "campaign-1", subject: "New homes", templateHtml: "<p>Hello {{Name}}</p>", bodyText: null, renderedHtml: null, newsArticleId: null, templateId: null, status: "DRAFT", template: null,
      properties: [], recipientCount: 3, startedAt: null, sentAt: null, completedAt: null, createdAt: new Date("2026-09-01T00:00:00.000Z"),
    };
    const subscribers = [
      { id: "subscriber-1", email: "first@example.test", name: "First" },
      { id: "subscriber-2", email: "second@example.test", name: "Second" },
      { id: "subscriber-3", email: "third@example.test", name: "Third" },
    ];
    mocked.prisma.campaign.findUniqueOrThrow.mockResolvedValue(campaignData);
    mocked.prisma.subscriber.findMany.mockResolvedValue(subscribers);
    mocked.prisma.campaignRecipient.findUniqueOrThrow
      .mockResolvedValueOnce({ id: "recipient-1", attemptCount: 0 })
      .mockResolvedValueOnce({ id: "recipient-2", attemptCount: 0 })
      .mockResolvedValueOnce({ id: "recipient-3", attemptCount: 0 });
    mocked.prisma.deliveryAttempt.create
      .mockResolvedValueOnce({ id: "attempt-1" })
      .mockResolvedValueOnce({ id: "attempt-2" })
      .mockResolvedValueOnce({ id: "attempt-3" });
    mocked.prisma.unsubscribeToken.create
      .mockResolvedValueOnce({ id: "unsubscribe-1" })
      .mockResolvedValueOnce({ id: "unsubscribe-2" })
      .mockResolvedValueOnce({ id: "unsubscribe-3" });
    mocked.prisma.campaign.update
      .mockResolvedValueOnce({ ...campaignData, status: "QUEUED", recipients: [], properties: [] })
      .mockResolvedValueOnce({
        ...campaignData,
        status: "SENDING",
        sentAt: new Date(),
        completedAt: new Date(),
        recipients: [
          { id: "recipient-1", status: "SENDING", recipientEmail: subscribers[0].email, recipientName: subscribers[0].name, attemptCount: 1, providerMessageId: "provider-1", errorMessage: null, sentAt: new Date(), failedAt: null },
          { id: "recipient-2", status: "SENDING", recipientEmail: subscribers[1].email, recipientName: subscribers[1].name, attemptCount: 1, providerMessageId: "provider-2", errorMessage: null, sentAt: new Date(), failedAt: null },
          { id: "recipient-3", status: "FAILED", recipientEmail: subscribers[2].email, recipientName: subscribers[2].name, attemptCount: 1, providerMessageId: null, errorMessage: "Mail server rejected the recipient", sentAt: null, failedAt: new Date() },
        ],
        events: [{ type: "FAILED" }],
      });
    mocked.sendMail
      .mockResolvedValueOnce({ messageId: "provider-1", accepted: [subscribers[0].email], rejected: [], response: "250 accepted" })
      .mockResolvedValueOnce({ messageId: "provider-2", accepted: [subscribers[1].email], rejected: [], response: "250 accepted" })
      .mockResolvedValueOnce({ messageId: "provider-3", accepted: [], rejected: [subscribers[2].email], response: "550 rejected" });

    const result = await root.sendCampaign({ id: "campaign-1" }, { token: "admin-token" });

    expect(mailTransport.sendMail).toHaveBeenCalledTimes(3);
    const deliveryHtml = vi.mocked(mailTransport.sendMail).mock.calls.map(([message]) => message.html);
    expect(deliveryHtml).toEqual(expect.arrayContaining([expect.stringContaining("Hello First"), expect.stringContaining("Hello Second"), expect.stringContaining("Hello Third")]));
    expect(deliveryHtml.every((html) => !html.includes("Sample Recipient"))).toBe(true);
    expect(deliveryHtml.every((html) => !html.includes("/campaign-open/"))).toBe(true);
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENDING" }) }));
    expect(mocked.prisma.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", errorMessage: "Mail server rejected the recipient" }) }));
    expect(result.status).toBe("SENDING");
    expect(result.sentCount).toBe(0);
    expect(result.failedCount).toBe(1);
  });
});
