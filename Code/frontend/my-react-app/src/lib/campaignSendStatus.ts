import type { Campaign } from "../api/schemaTypes";

export function campaignSendStatusMessage(campaign: Pick<Campaign, "status" | "recipientCount" | "sentCount" | "failedCount">) {
  const sent = campaign.sentCount ?? 0;
  const failed = campaign.failedCount ?? 0;
  if (campaign.status === "SENDING") return `Campaign accepted by the email provider; awaiting delivery confirmation for ${campaign.recipientCount} recipient${campaign.recipientCount === 1 ? "" : "s"}.`;
  if (campaign.status === "SENT") return `Campaign sent successfully to ${sent} recipient${sent === 1 ? "" : "s"}.`;
  if (sent) return `Campaign completed: ${sent} sent, ${failed} failed.`;
  return campaign.recipientCount === 0 ? "Campaign failed: no eligible recipients." : "Campaign failed: no emails were accepted by the mail server.";
}
