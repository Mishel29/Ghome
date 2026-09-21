import { publicBackendUrl } from "./runtimeConfig.js";

export function unsubscribeUrl(token: string, campaignToken?: string, env = process.env) {
  const campaignQuery = campaignToken ? `&campaignToken=${encodeURIComponent(campaignToken)}` : "";
  return `${publicBackendUrl(env)}/unsubscribe?token=${encodeURIComponent(token)}${campaignQuery}`;
}

export function campaignClickUrl(token: string, destination: string, propertyId?: string, env = process.env) {
  const query = new URLSearchParams({ token, ...(propertyId ? { propertyId } : { destination }) });
  return `${publicBackendUrl(env)}/campaign-click?${query.toString()}`;
}
