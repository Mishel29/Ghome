const CAMPAIGN_ATTRIBUTION_KEY = "harborstone-campaign-attribution";

export interface CampaignAttribution {
  token: string;
  enteredAt: string;
}

function validToken(token: string | null | undefined): token is string {
  return typeof token === "string" && token.trim().length > 0;
}

export function setCampaignAttribution(token: string) {
  if (!validToken(token)) return;
  sessionStorage.setItem(CAMPAIGN_ATTRIBUTION_KEY, JSON.stringify({ token, enteredAt: new Date().toISOString() }));
}

export function getCampaignAttribution(): CampaignAttribution | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(CAMPAIGN_ATTRIBUTION_KEY) ?? "null") as Partial<CampaignAttribution> | null;
    return value && validToken(value.token) && typeof value.enteredAt === "string" ? { token: value.token, enteredAt: value.enteredAt } : null;
  } catch {
    clearCampaignAttribution();
    return null;
  }
}

export function getCampaignAttributionToken() {
  return getCampaignAttribution()?.token;
}

export function clearCampaignAttribution() {
  sessionStorage.removeItem(CAMPAIGN_ATTRIBUTION_KEY);
}

export function captureCampaignAttributionFromUrl(search = window.location.search) {
  const token = new URLSearchParams(search).get("campaignToken");
  if (validToken(token)) setCampaignAttribution(token);
  return token ?? getCampaignAttributionToken();
}
