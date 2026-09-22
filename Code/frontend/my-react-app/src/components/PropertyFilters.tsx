import type { PropertyFilterInput, PropertyFilterOptions } from "../api/schemaTypes";
import { Field, inputClass } from "./AdminUI";

const defaultPropertyTypes = ["House", "Apartment"];
const defaultSaleTypes = ["New", "Second hand", "Third hand", "Fourth hand"];
const statusOptions = [["DRAFT", "Draft"], ["COMING_SOON", "Coming soon"], ["ON_SALE", "On sale"], ["SOLD_OUT", "Sold out"], ["OFFLINE", "Offline"]] as const;
const stageOptions = [["PLANNING", "Planning"], ["UNDER_CONSTRUCTION", "Under construction"], ["READY_TO_MOVE", "Ready to move-in"]] as const;

type Props = { value: PropertyFilterInput; onChange: (value: PropertyFilterInput) => void; metrics?: boolean; options?: PropertyFilterOptions | null };

export default function PropertyFilters({ value, onChange, metrics = false, options }: Props) {
  const set = (key: keyof PropertyFilterInput, nextValue: unknown) => onChange({ ...value, [key]: nextValue === "" ? undefined : nextValue });
  const propertyTypes = options === undefined ? defaultPropertyTypes : options?.propertyTypes ?? [];
  const saleTypes = options === undefined ? defaultSaleTypes : options?.saleTypes ?? [];
  const countField = (key: "minBedrooms" | "maxBedrooms" | "minBathrooms" | "maxBathrooms", label: string, values: number[]) => options === undefined
    ? <Field label={label}><input className={inputClass} type="number" min="0" value={value[key] ?? ""} onChange={(event) => set(key, event.target.value ? Number(event.target.value) : "")} /></Field>
    : <Field label={label}><select className={inputClass} value={value[key] ?? ""} onChange={(event) => set(key, event.target.value ? Number(event.target.value) : "")}><option value="">Any</option>{values.map((count) => <option value={count} key={count}>{count}</option>)}</select></Field>;

  return <div className="bg-white p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {([['search', 'Search', 'text'], ['postalCode', 'Postal code', 'text'], ['minPrice', 'Minimum price', 'number'], ['maxPrice', 'Maximum price', 'number'], ['completionYear', 'Completion year', 'number']] as const).map(([key, label, type]) => <Field key={key} label={label}><input className={inputClass} type={type} min={type === "number" ? 0 : undefined} value={value[key] ?? ""} onChange={(event) => set(key, type === "number" && event.target.value ? Number(event.target.value) : event.target.value)} /></Field>)}
    {options !== undefined ? <><Field label="County"><select className={inputClass} value={value.county ?? ""} onChange={(event) => set("county", event.target.value)}><option value="">All counties</option>{options?.counties.map((county) => <option value={county} key={county}>{county}</option>)}</select></Field><Field label="Location"><select className={inputClass} value={value.location ?? ""} onChange={(event) => set("location", event.target.value)}><option value="">All locations</option>{options?.locations.map((location) => <option value={location} key={location}>{location}</option>)}</select></Field></> : <Field label="Location"><input className={inputClass} value={value.location ?? ""} onChange={(event) => set("location", event.target.value)} /></Field>}
    <Field label="Property type"><select className={inputClass} value={value.type ?? ""} onChange={(event) => set("type", event.target.value)}><option value="">All types</option>{propertyTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></Field>
    <Field label="Sale type"><select className={inputClass} value={value.saleType ?? ""} onChange={(event) => set("saleType", event.target.value)}><option value="">All sale types</option>{saleTypes.map((saleType) => <option value={saleType} key={saleType}>{saleType}</option>)}</select></Field>
    {options !== undefined && <><Field label="Size category"><select className={inputClass} value={value.sizeCategory ?? ""} onChange={(event) => set("sizeCategory", event.target.value)}><option value="">All sizes</option>{options?.sizeCategories.map((sizeCategory) => <option value={sizeCategory} key={sizeCategory}>{sizeCategory}</option>)}</select></Field><Field label="Agent"><select className={inputClass} value={value.agentId ?? ""} onChange={(event) => set("agentId", event.target.value)}><option value="">All agents</option>{options?.agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name}</option>)}</select></Field></>}
    {countField("minBedrooms", "Minimum bedrooms", options?.bedrooms ?? [])}
    {countField("maxBedrooms", "Maximum bedrooms", options?.bedrooms ?? [])}
    {countField("minBathrooms", "Minimum bathrooms", options?.bathrooms ?? [])}
    {countField("maxBathrooms", "Maximum bathrooms", options?.bathrooms ?? [])}
    <Field label="Sales status"><select className={inputClass} value={value.status ?? ""} onChange={(event) => set("status", event.target.value)}><option value="">All</option>{statusOptions.map(([status, label]) => <option value={status} key={status}>{label}</option>)}</select></Field>
    <Field label="Stage"><select className={inputClass} value={value.stage ?? ""} onChange={(event) => set("stage", event.target.value)}><option value="">All</option>{stageOptions.map(([stage, label]) => <option value={stage} key={stage}>{label}</option>)}</select></Field>
    <Field label="Sort"><select className={inputClass} value={value.sort ?? "latest"} onChange={(event) => set("sort", event.target.value)}><option value="latest">Latest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>{metrics && <><option value="clicks">Most clicks</option><option value="interests">Most interests</option></>}</select></Field>
    {metrics && <><Field label="Minimum clicks"><input className={inputClass} type="number" min="0" value={value.minClicks ?? ""} onChange={(event) => set("minClicks", event.target.value ? Number(event.target.value) : "")} /></Field><Field label="Minimum interests"><input className={inputClass} type="number" min="0" value={value.minInterests ?? ""} onChange={(event) => set("minInterests", event.target.value ? Number(event.target.value) : "")} /></Field><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={value.notCampaigned ?? false} onChange={(event) => set("notCampaigned", event.target.checked)} />Not previously campaigned</label></>}
  </div>;
}
