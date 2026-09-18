import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { propertyById, publishProperty, saveProperty } from "../../api/properties";
import type { HouseTypeInput, Property } from "../../api/schemaTypes";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>(() => {
    const fields: Record<string, string> = { name: "", agentName: "", status: "ON_SALE", stage: "", images: "", historicalPrices: "" };
    if (record) for (const field of [...textFields.map(([k]) => k), ...numberFields.map(([k]) => k), "status", "stage"]) fields[field] = String(record[field as keyof Property] ?? "");
    if (record) { fields.agentName = record.agent?.name ?? ""; fields.images = record.media.filter((m) => m.type === "IMAGE").map((m) => m.url).join("\n"); fields.historicalPrices = JSON.stringify(record.historicalPrices, null, 2); }
    return fields;
  });
  const set = (key: string, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
    setFieldErrors((old) => ({ ...old, [key]: "" }));
  };
  function validate() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Property name is required.";
    for (const [key] of numberFields) {
      if (!form[key]?.trim()) continue;
      const value = Number(form[key]);
      if (!Number.isFinite(value) || value < 0) next[key] = "Enter a non-negative number.";
    }
    if (form.completionYear.trim() && (!Number.isInteger(Number(form.completionYear)) || Number(form.completionYear) < 1800 || Number(form.completionYear) > 2200)) {
      next.completionYear = "Enter a year between 1800 and 2200.";
    }
    if (form.historicalPrices.trim()) {
      try {
        const history: unknown = JSON.parse(form.historicalPrices);
        if (!Array.isArray(history) || history.some((item) => !item || !Number.isInteger(item.year) || !Number.isFinite(item.price) || item.price <= 0)) {
          next.historicalPrices = "Use positive { year, price } objects.";
        } else if (history.some((item, index) => index > 0 && item.year <= history[index - 1].year)) {
          next.historicalPrices = "Years must be strictly ascending.";
        }
      } catch {
        next.historicalPrices = "Use valid JSON, for example [{\"year\":2021,\"price\":410000}].";
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }
  async function submit(publish: boolean) {
    if (!validate()) return;
    setBusy(true); setError("");
    try {
      const input: Record<string, unknown> = { name: form.name, status: form.status, stage: form.stage || null };
      input.agentName = form.agentName.trim() || null;
      for (const [key] of textFields) input[key] = form[key]?.trim() || null;
      input.name = form.name;
      for (const [key] of numberFields) input[key] = form[key]?.trim() ? Number(form[key]) : null;
      input.images = form.images.split("\n").filter((s) => s.trim()).map((url) => ({ url: url.trim() }));
      if (form.historicalPrices.trim()) {
        const history: unknown = JSON.parse(form.historicalPrices);
        if (!Array.isArray(history) || history.some((item) => !item || !Number.isInteger(item.year) || !Number.isFinite(item.price) || item.price <= 0)) {
          throw new Error("Historical prices must be an array of { year, price } objects with positive prices.");
        }
        input.historicalPrices = history;
      } else {
        input.historicalPrices = [];
      }
      const saved = await saveProperty(input as unknown as HouseTypeInput, savedId);
      setSavedId(saved.id);
      if (publish) await publishProperty(saved.id);
      navigate("/admin/properties");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save property"); } finally { setBusy(false); }
  }
  const control = "w-full border border-[#ddd5c5] bg-white px-3 py-2 text-sm";
  return <div className="p-5 md:p-8 max-w-5xl space-y-6"><Link to="/admin/properties" className="text-sm underline">← Property Management</Link><h1 className="font-display text-3xl font-bold">{record ? "Edit Property" : "Add Property"}</h1><p className="text-sm text-stone">Enter the core details, optionally add price history and images, then save as a draft or publish.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <form onSubmit={(e) => { e.preventDefault(); void submit(false); }} className="bg-white p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">{textFields.map(([key, label, placeholder, help]) => <label key={key} className="text-sm"><span className="flex items-center gap-2">{label}{key === "name" && " *"}<Hint text={help} /></span>{key === "description" ? <textarea className={control} rows={4} placeholder={placeholder} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} /> : <input className={`${control} ${fieldErrors[key] ? "border-red-500" : ""}`} placeholder={placeholder} value={form[key] ?? ""} required={key === "name"} onChange={(e) => set(key, e.target.value)} />}{fieldErrors[key] && <span className="block mt-1 text-xs text-red-600">{fieldErrors[key]}</span>}</label>)}
      {numberFields.map(([key, label, placeholder, help]) => <label key={key} className="text-sm"><span className="flex items-center gap-2">{label}<Hint text={help} /></span><input type="number" min="0" step={key.includes("price") || key.includes("size") ? "0.01" : "1"} placeholder={placeholder} className={`${control} ${fieldErrors[key] ? "border-red-500" : ""}`} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} />{fieldErrors[key] && <span className="block mt-1 text-xs text-red-600">{fieldErrors[key]}</span>}</label>)}
      <label className="text-sm"><span className="flex items-center gap-2">Sales state<Hint text="ON_SALE makes the property available for sale; new properties are usually saved as DRAFT first." /></span><select className={control} value={form.status} onChange={(e) => set("status", e.target.value)}>{["DRAFT", "COMING_SOON", "ON_SALE", "SOLD_OUT", "OFFLINE"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label className="text-sm"><span className="flex items-center gap-2">Construction stage<Hint text="Use READY_TO_MOVE for a completed home, UNDER_CONSTRUCTION for an active build, or PLANNING." /></span><select className={control} value={form.stage} onChange={(e) => set("stage", e.target.value)}><option value="">Not specified</option>{["PLANNING", "UNDER_CONSTRUCTION", "READY_TO_MOVE"].map((v) => <option key={v}>{v}</option>)}</select></label>
        </div>
      <label className="block text-sm"><span className="flex items-center gap-2">Image URLs<Hint text="Paste one image URL per line. The first image becomes the primary image." /></span><textarea className={control} rows={4} placeholder="https://example.com/property.jpg" value={form.images} onChange={(e) => set("images", e.target.value)} /></label>
      <label className="block text-sm"><span className="flex items-center gap-2">Historical prices<Hint text={'Optional JSON array. Example: [{"year":2021,"price":410000}]. Years must be ascending and the first year should match Completion year.'} /></span><textarea className={`${control} ${fieldErrors.historicalPrices ? "border-red-500" : ""}`} rows={5} placeholder={'[{"year":2021,"price":410000}]'} value={form.historicalPrices} onChange={(e) => set("historicalPrices", e.target.value)} />{fieldErrors.historicalPrices && <span className="block mt-1 text-xs text-red-600">{fieldErrors.historicalPrices}</span>}</label>
      <div className="flex gap-3"><button disabled={busy} className="border border-navy px-5 py-3 disabled:opacity-40" type="submit">Save Draft</button><button disabled={busy} className="bg-amber text-white px-5 py-3 disabled:opacity-40" type="button" onClick={() => void submit(true)}>Save & Publish</button></div>
    </form><ImageUpload onUploaded={(url)=>set("images",[form.images,url].filter(Boolean).join("\n"))}/></div>;
}
  const textFields = [
    ["name", "Property name", "e.g. Oakfield Manor", "Required display name for the property."],
    ["agentName", "Agent", "e.g. Aoife Kelly", "The agent is created or updated as an AGENT user and linked to this property."],
    ["type", "Property type", "e.g. House or Apartment", "Use the human-readable property type from the CSV schema."],
    ["description", "Description", "Describe the property and nearby amenities", "A concise public-facing description."],
    ["county", "County", "e.g. Dublin", "County used by public filters."],
    ["address", "Address", "e.g. 12 Main Street", "Full property address."],
    ["postalCode", "Postal code", "e.g. Dublin 6", "Postal or area code."],
    ["saleType", "Sale type", "e.g. New or Second hand", "Maps from the CSV Sold times field."],
    ["sizeCategory", "Property size category", "e.g. 38 to 125 sq metres", "Optional human-readable size band."],
  ] as const;
  const numberFields = [
    ["priceMin", "Current price (€)", "e.g. 5250", "Authoritative current price. Prices must be non-negative."],
    ["bedroomsMin", "Bedrooms", "e.g. 3", "Number of bedrooms."],
    ["bathroomsMin", "Bathrooms", "e.g. 2", "Number of bathrooms."],
    ["sizeSqm", "Property size (m²)", "e.g. 79", "Property floor area in square metres."],
    ["completionYear", "Completion year", "e.g. 2024", "Integer year between 1800 and 2200."],
  ] as const;

  function Hint({ text }: { text: string }) {
    const [open, setOpen] = useState(false);
    return <span className="relative inline-block align-middle">
      <button type="button" aria-label="Show field example" className="w-5 h-5 rounded-full border border-stone text-[11px] text-stone" onClick={() => setOpen((value) => !value)}>?</button>
      {open && <span role="status" className="absolute z-10 left-7 top-0 w-64 bg-navy text-white text-xs font-normal p-3 shadow-lg">{text}</span>}
    </span>;
  }
