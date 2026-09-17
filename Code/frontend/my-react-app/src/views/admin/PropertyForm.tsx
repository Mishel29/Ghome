import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { propertyById, publishProperty, saveProperty } from "../../api/properties";
import type { HouseTypeInput, Property } from "../../api/schemaTypes";
import HomeTour from "../../components/HomeTour";
import ImageUpload from "../../components/ImageUpload";

export default function PropertyForm() {
  const { id } = useParams(); const [record, setRecord] = useState<Property | null>(null); const [error, setError] = useState(""); const [loaded, setLoaded] = useState<string | undefined>();
  useEffect(() => { if (!id) return; let alive = true; propertyById(id, true).then((p) => { if (alive) { setRecord(p); setLoaded(id); if (!p) setError("Property not found"); } }).catch((e) => { if (alive) { setError(e.message); setLoaded(id); } }); return () => { alive = false; }; }, [id]);
  if (id && loaded !== id) return <p className="p-8">Loading property…</p>;
  if (error) return <p role="alert" className="p-8 text-red-700">{error}</p>;
  return <Editor key={id ?? "new"} record={record} />;
}
function Editor({ record }: { record: Property | null }) {
  const [savedId, setSavedId] = useState(record?.id);
  const navigate = useNavigate(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>(() => {
    const fields: Record<string, string> = { name: "", status: "ON_SALE", stage: "", images: "", features: "", bedroomOptions: "", bathroomOptions: "" };
    if (record) for (const field of [...textFields.map(([k]) => k), ...numberFields.map(([k]) => k), "status", "stage"]) fields[field] = String(record[field as keyof Property] ?? "");
    if (record) { fields.images = record.media.filter((m) => m.type === "IMAGE").map((m) => m.url).join("\n"); fields.features = record.features.map((f) => f.name).join("\n"); fields.bedroomOptions = record.bedroomOptions.join(","); fields.bathroomOptions = record.bathroomOptions.join(","); }
    return fields;
  });
  const set = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(publish: boolean) {
    setBusy(true); setError("");
    try {
      const input: Record<string, unknown> = { name: form.name, status: form.status, stage: form.stage || null };
      for (const [key] of textFields) input[key] = form[key]?.trim() || null;
      input.name = form.name;
      for (const [key] of numberFields) input[key] = form[key]?.trim() ? Number(form[key]) : null;
      input.images = form.images.split("\n").filter((s) => s.trim()).map((url) => ({ url: url.trim() }));
      input.features = form.features.split("\n").filter((s) => s.trim());
      for (const key of ["bedroomOptions", "bathroomOptions"]) input[key] = form[key].trim() ? form[key].split(",").map(Number) : [];
      const saved = await saveProperty(input as unknown as HouseTypeInput, savedId);
      setSavedId(saved.id);
      if (publish) await publishProperty(saved.id);
      navigate("/admin/properties");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save property"); } finally { setBusy(false); }
  }
  const control = "w-full border border-[#ddd5c5] bg-white px-3 py-2 text-sm";
  return <div className="p-5 md:p-8 max-w-5xl space-y-6"><Link to="/admin/properties" className="text-sm underline">← Property Management</Link><h1 className="font-display text-3xl font-bold">{record ? "Edit Property" : "Add Property"}</h1><p className="text-sm text-stone">Save a draft at any time. Publishing requires price, bedrooms, bathrooms, floor area, house type and an image. Saving changes returns published content to draft.</p>
    {error && <div role="alert" className="bg-red-50 text-red-700 p-4">{error}</div>}
    <form onSubmit={(e) => { e.preventDefault(); void submit(false); }} className="bg-white p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">{textFields.map(([key, label]) => <label key={key} className="text-sm">{label}{key === "name" && " *"}{key === "description" ? <textarea className={control} rows={4} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} /> : <input className={control} value={form[key] ?? ""} required={key === "name"} onChange={(e) => set(key, e.target.value)} />}</label>)}
      {numberFields.map(([key, label]) => <label key={key} className="text-sm">{label}<input type="number" min="0" step={key.includes("price") || key.includes("size") ? "0.01" : "1"} className={control} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} /></label>)}
      <label className="text-sm">Sales state<select className={control} value={form.status} onChange={(e) => set("status", e.target.value)}>{["DRAFT", "COMING_SOON", "ON_SALE", "SOLD_OUT", "OFFLINE"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label className="text-sm">Construction stage<select className={control} value={form.stage} onChange={(e) => set("stage", e.target.value)}><option value="">Not specified</option>{["PLANNING", "UNDER_CONSTRUCTION", "READY_TO_MOVE"].map((v) => <option key={v}>{v}</option>)}</select></label>
      {[["bedroomOptions", "Exact bedroom options, comma separated"], ["bathroomOptions", "Exact bathroom options, comma separated"]].map(([key, label]) => <label key={key} className="text-sm">{label}<input className={control} value={form[key]} onChange={(e) => set(key, e.target.value)} /></label>)}</div>
      <label className="block text-sm">Image URLs (one per line; first is primary)<textarea className={control} rows={4} value={form.images} onChange={(e) => set("images", e.target.value)} /></label>
      <label className="block text-sm">Features (one per line)<textarea className={control} rows={3} value={form.features} onChange={(e) => set("features", e.target.value)} /></label>
      <div className="flex gap-3"><button disabled={busy} className="border border-navy px-5 py-3 disabled:opacity-40" type="submit">Save Draft</button><button disabled={busy} className="bg-amber text-white px-5 py-3 disabled:opacity-40" type="button" onClick={() => void submit(true)}>Save & Publish</button></div>
    </form><ImageUpload onUploaded={(url)=>set("images",[form.images,url].filter(Boolean).join("\n"))}/>{savedId?<HomeTour propertyId={savedId}/>:<p className="text-sm text-stone">Save the property before generating a home tour.</p>}</div>;
}
const textFields = [["name", "Property / house-type name"], ["type", "House type"], ["description", "Description"], ["location", "Location"], ["county", "County"], ["address", "Address"], ["postalCode", "Postal code"], ["saleType", "Sale type"], ["slug", "URL slug"], ["sourceKey", "Import source key"], ["developmentId", "Development ID"], ["agentId", "Agent ID"], ["sizeCategory", "Size category"], ["listedDate", "Listed date (ISO format)"]] as const;
const numberFields = [["priceMin", "Price from (€)"], ["priceMax", "Maximum price (€)"], ["bedroomsMin", "Minimum bedrooms"], ["bedroomsMax", "Maximum bedrooms"], ["bathroomsMin", "Minimum bathrooms"], ["bathroomsMax", "Maximum bathrooms"], ["sizeSqm", "Floor area from (m²)"], ["sizeSqmMax", "Maximum floor area (m²)"], ["completionYear", "Completion year"]] as const;
