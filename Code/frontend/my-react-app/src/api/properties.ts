import { historyGrowth } from "../lib/calculations";
import { graphqlRequest } from "./graphql";
import type { Property, PropertyConnection, PropertyFilterInput, PropertyFilterOptions, HouseTypeInput } from "./schemaTypes";
import type { Property as ViewProperty } from "../data";

export const PROPERTY_FIELDS = `id clickCount interestCount saveCount campaigned sourceKey agentId name slug developmentId location county address postalCode type saleType status stage publicationStatus publishedAt priceMin priceMax bedroomsMin bedroomsMax bathroomsMin bathroomsMax sizeSqm sizeSqmMax sizeCategory completionYear description bedroomOptions bathroomOptions listedDate createdAt updatedAt agent {id name email role createdAt} media {id url type isPrimary sortOrder altText aiJobId} features {id name} valueHistory {id year value growthPercent isSynthetic source} historicalPrices {year price}`;
export const PROPERTY_FILTER_OPTIONS_QUERY = `query { propertyFilterOptions { propertyTypes saleTypes counties locations sizeCategories bedrooms bathrooms agents { id name } } }`;
export async function propertyPage(admin: boolean, filter: PropertyFilterInput = {}, offset = 0, limit = 20) {
  const field = admin ? "adminProperties" : "properties";
  const result = await graphqlRequest<Record<string, PropertyConnection>>(`query($filter:PropertyFilterInput,$offset:Int,$limit:Int){${field}(filter:$filter,offset:$offset,limit:$limit){totalCount nodes{${PROPERTY_FIELDS}}}}`, { filter, offset, limit });
  return result[field];
}
export async function propertyById(id: string, admin = false) {
  const field = admin ? "adminProperty" : "property";
  return (await graphqlRequest<Record<string, Property | null>>(`query($id:ID!){${field}(id:$id){${PROPERTY_FIELDS}}}`, { id }))[field];
}
export async function saveProperty(input: HouseTypeInput, id?: string) {
  return (await graphqlRequest<{ saveProperty: Property }>(`mutation($id:ID,$input:HouseTypeInput!){saveProperty(id:$id,input:$input){${PROPERTY_FIELDS}}}`, { id, input })).saveProperty;
}
export async function publishProperty(id: string) { return (await graphqlRequest<{ publishProperty: Property }>(`mutation($id:ID!){publishProperty(id:$id){${PROPERTY_FIELDS}}}`, { id })).publishProperty; }
export async function publishProperties(ids: string[]) { return (await graphqlRequest<{ publishProperties: number }>('mutation($ids:[ID!]!){publishProperties(ids:$ids)}', { ids })).publishProperties; }
export async function deleteProperty(id: string) { await graphqlRequest('mutation($id:ID!){deleteProperty(id:$id)}', { id }); }
export function clearUnavailablePropertyFilters(filter: PropertyFilterInput, options: PropertyFilterOptions): PropertyFilterInput {
  const next = { ...filter };
  const clearText = (key: "type" | "saleType" | "county" | "location" | "sizeCategory", values: string[]) => {
    if (next[key] && !values.some((value) => value.localeCompare(next[key]!, "en-IE", { sensitivity: "base" }) === 0)) delete next[key];
  };
  clearText("type", options.propertyTypes);
  clearText("saleType", options.saleTypes);
  clearText("county", options.counties);
  clearText("location", options.locations);
  clearText("sizeCategory", options.sizeCategories);
  if (next.agentId && !options.agents.some((agent) => agent.id === next.agentId)) delete next.agentId;
  if (next.minBedrooms != null && !options.bedrooms.includes(next.minBedrooms)) delete next.minBedrooms;
  if (next.maxBedrooms != null && !options.bedrooms.includes(next.maxBedrooms)) delete next.maxBedrooms;
  if (next.minBathrooms != null && !options.bathrooms.includes(next.minBathrooms)) delete next.minBathrooms;
  if (next.maxBathrooms != null && !options.bathrooms.includes(next.maxBathrooms)) delete next.maxBathrooms;
  return next;
}
const statuses = { ON_SALE: "on-sale", COMING_SOON: "coming-soon", SOLD_OUT: "sold-out", OFFLINE: "offline", DRAFT: "draft" } as const;
const stages = { PLANNING: "Planning", UNDER_CONSTRUCTION: "Under Construction", READY_TO_MOVE: "Ready to Move" } as const;
export function viewProperty(p: Property): ViewProperty {
  const photos = p.media.filter((m) => m.type === "IMAGE").sort((a, b) => a.sortOrder - b.sortOrder);
  return { id: p.id, name: p.name, location: p.location ?? "", county: p.county ?? "", postalCode: p.postalCode ?? "", address: p.address ?? "",
    status: p.publicationStatus === "DRAFT" ? "draft" : statuses[p.status], type: p.type ?? "", saleType: p.saleType ?? "",
    price: { min: p.priceMin ?? 0, max: p.priceMax ?? p.priceMin ?? 0 },
    beds: p.bedroomOptions.length ? p.bedroomOptions : p.bedroomsMin == null ? [] : [...new Set([p.bedroomsMin, p.bedroomsMax ?? p.bedroomsMin])],
    baths: p.bathroomOptions.length ? p.bathroomOptions : p.bathroomsMin == null ? [] : [...new Set([p.bathroomsMin, p.bathroomsMax ?? p.bathroomsMin])],
    image: photos.find((m) => m.isPrimary)?.url ?? photos[0]?.url ?? "/favicon.svg", photos: photos.map((m) => m.url), videoUrl: p.media.find((m) => m.type === "VIDEO" && m.isPrimary)?.url,
    overlayColor: "rgba(27,42,74,0.85)", description: p.description ?? "", features: p.features.map((f) => f.name),
    stage: p.stage ? stages[p.stage] : "Not specified", listedDate: p.listedDate ?? p.createdAt,
    completionYear: p.completionYear,
    sqft: { min: Math.round((p.sizeSqm ?? 0) * 10.7639), max: Math.round((p.sizeSqmMax ?? p.sizeSqm ?? 0) * 10.7639) },
    agent: p.agent?.name ?? "", valueGrowth: historyGrowth(p.historicalPrices.length ? p.historicalPrices : p.valueHistory), historyIsSynthetic: p.valueHistory.some((h)=>h.isSynthetic),
    interestCount: p.interestCount, clickCount: p.clickCount, saveCount: p.saveCount, campaigned: p.campaigned };
}

