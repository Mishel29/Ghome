import { useState } from "react";
import { Link } from "react-router-dom";
import { useAction, useQuery } from "../../api/useQuery";
import { clearUnavailablePropertyFilters, deleteProperty, PROPERTY_FIELDS, PROPERTY_FILTER_OPTIONS_QUERY, publishProperties, publishProperty, saveProperty } from "../../api/properties";
import type { Property, PropertyConnection, PropertyFilterInput, PropertyFilterOptions } from "../../api/schemaTypes";
import { fmt } from "../../data";
import PropertyFilters from "../../components/PropertyFilters";
import { AdminPage, Button, Feedback, Pager } from "../../components/AdminUI";

export default function AdminProperties() {
  const [filter, setFilter] = useState<PropertyFilterInput>({});
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState<Property | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const filterOptionsQuery = useQuery<{ propertyFilterOptions: PropertyFilterOptions }>(PROPERTY_FILTER_OPTIONS_QUERY);
  const activeFilter = filterOptionsQuery.data?.propertyFilterOptions ? clearUnavailablePropertyFilters(filter, filterOptionsQuery.data.propertyFilterOptions) : filter;
  const query = useQuery<{ adminProperties: PropertyConnection }>(`query($filter:PropertyFilterInput,$offset:Int){adminProperties(filter:$filter,offset:$offset){totalCount nodes{${PROPERTY_FIELDS}}}}`, { filter: activeFilter, offset });
  const action = useAction();

  const reloadPropertyData = () => { query.reload(); filterOptionsQuery.reload(); };
  const act = (work: () => Promise<unknown>, message: string) => action.run(async () => { await work(); reloadPropertyData(); }, message);
  const visibleDraftIds = query.data?.adminProperties.nodes.filter((property) => property.publicationStatus === "DRAFT").map((property) => property.id) ?? [];
  const toggleSelected = (id: string) => setSelectedIds((selected) => selected.includes(id) ? selected.filter((selectedId) => selectedId !== id) : [...selected, id]);
  const publishSelected = () => {
    if (!selectedIds.length || !window.confirm(`Publish ${selectedIds.length} selected ${selectedIds.length === 1 ? "property" : "properties"}?`)) return;
    void action.run(async () => { await publishProperties(selectedIds); setSelectedIds([]); reloadPropertyData(); }, "Selected properties published");
  };

  return <AdminPage title="Property Management" description={`${query.data?.adminProperties.totalCount ?? 0} properties · drafts are private`}>
    <div className="flex gap-3"><Link className="border border-navy px-4 py-2" to="/admin/properties/import">Bulk Import Properties</Link><Link className="bg-amber text-white px-4 py-2" to="/admin/properties/new">Add Property</Link></div>
    <PropertyFilters value={activeFilter} options={filterOptionsQuery.data?.propertyFilterOptions ?? null} onChange={(next) => { setFilter(next); setOffset(0); }} />
    {filterOptionsQuery.loading && <p role="status" className="text-sm text-stone">Loading filter options…</p>}
    {filterOptionsQuery.error && <div role="alert" className="flex items-center gap-3 text-sm text-red-700"><span>Filter options could not be loaded. Property results remain available.</span><Button onClick={filterOptionsQuery.reload}>Retry</Button></div>}
    <label className="text-sm">Publication <select className="border p-2 bg-white" aria-label="Publication" value={activeFilter.publicationStatus ?? ""} onChange={(event) => { setFilter({ ...activeFilter, publicationStatus: event.target.value as "DRAFT" | "PUBLISHED" || undefined }); setOffset(0); }}><option value="">All</option><option>DRAFT</option><option>PUBLISHED</option></select></label>
    <div className="flex items-center gap-3 flex-wrap bg-white border border-[#ddd5c5] p-3"><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={visibleDraftIds.length > 0 && visibleDraftIds.every((id) => selectedIds.includes(id))} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...visibleDraftIds])] : selectedIds.filter((id) => !visibleDraftIds.includes(id)))} disabled={!visibleDraftIds.length || action.busy} />Select visible drafts</label><span className="text-sm text-stone">{selectedIds.length} selected</span><Button disabled={!selectedIds.length || action.busy} onClick={publishSelected}>Publish selected</Button></div>
    <Feedback loading={query.loading} error={query.error || action.error} success={action.success} />
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{query.data?.adminProperties.nodes.map((property) => <article className="bg-white border border-[#ddd5c5]" key={property.id}>{property.media.find((media) => media.type === "IMAGE") && <img className="w-full h-40 object-cover" src={property.media.find((media) => media.type === "IMAGE")!.url} alt={property.name} loading="lazy" />}<div className="p-4 space-y-3">{property.publicationStatus === "DRAFT" && <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={selectedIds.includes(property.id)} onChange={() => toggleSelected(property.id)} disabled={action.busy} />Select draft</label>}<h2 className="font-semibold">{property.name}</h2><p className="text-sm text-stone">{property.location ?? property.county ?? "Location not specified"}</p><p>{property.priceMin == null ? "Price not set" : fmt(property.priceMin)}</p><p className="text-xs">{property.status} · {property.publicationStatus} · {property.stage ?? "Stage not set"}</p><div className="flex gap-3 flex-wrap text-sm"><Button onClick={() => setView(property)}>View</Button><Link className="underline py-2" to={`/admin/properties/${property.id}/edit`}>Edit</Link><Button disabled={action.busy} onClick={() => void act(() => property.publicationStatus === "DRAFT" ? publishProperty(property.id) : saveProperty({ name: property.name }, property.id), property.publicationStatus === "DRAFT" ? "Property published" : "Property saved as draft")}>{property.publicationStatus === "DRAFT" ? "Publish" : "Save as draft"}</Button><Button disabled={action.busy} onClick={() => { if (window.confirm(`Delete ${property.name}? Related records may prevent deletion.`)) void act(() => deleteProperty(property.id), "Property deleted"); }}>Delete</Button></div></div></article>)}</div>
    {!query.loading && !query.data?.adminProperties.nodes.length && <p>No properties match these filters.</p>}
    <Pager offset={offset} total={query.data?.adminProperties.totalCount ?? 0} onChange={setOffset} />
    {view && <div role="dialog" aria-modal="true" aria-label="Property details" className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6"><section className="bg-white p-6 max-w-2xl max-h-[90vh] overflow-auto space-y-4"><h2 className="text-2xl font-display">{view.name}</h2><p>{view.description || "No description yet"}</p><p>{view.address} {view.postalCode}</p><p>{view.type} · {view.bedroomsMin}–{view.bedroomsMax ?? view.bedroomsMin} bedrooms · {view.bathroomsMin} bathrooms · {view.sizeSqm} m²</p><p>Completed: {view.completionYear ?? "Not specified"}</p><p>Agent: {view.agent?.name || "Not assigned"}</p><p>{view.features.map((feature) => feature.name).join(", ")}</p><Button onClick={() => setView(null)}>Close</Button></section></div>}
  </AdminPage>;
}
