import { useState } from "react";
import { useApp } from "../../context";
import type { Property } from "../../data";
import { useNavigate, useParams } from "react-router-dom";

const Field = ({
  label,
  req,
  error,
  children,
}: {
  label: string;
  req?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">
      {label}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
  </div>
);

const BLANK: Omit<Property, "id" | "valueGrowth" | "interestCount" | "clickCount" | "saveCount" | "campaigned"> = {
  name: "", location: "", county: "Dublin", address: "", status: "draft",
  type: "", price: { min: 300000, max: 500000 }, beds: [2, 3], baths: [1, 2],
  image: "", photos: [], overlayColor: "rgba(74,103,65,0.78)", description: "",
  features: [], stage: "Planning", listedDate: new Date().toISOString().split("T")[0],
  sqft: { min: 800, max: 1400 }, agent: "",
};

export default function PropertyForm() {
  const { properties, setProperties } = useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const existing = id ? properties.find((p) => p.id === id) : null;

  const [form, setForm] = useState<typeof BLANK>(existing ? { ...existing } : { ...BLANK });
  const [featureInput, setFeatureInput] = useState("");
  const [photoInput, setPhotoInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoStatus, setVideoStatus] = useState<"idle" | "generating" | "review" | "done">("idle");
  const [tab, setTab] = useState<"details" | "photos" | "video">("details");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Development name required";
    if (!form.location.trim()) e.location = "Location required";
    if (!form.agent.trim()) e.agent = "Agent required";
    if (!form.description.trim()) e.description = "Description required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = (publish = false) => {
    if (!validate()) return;
    const status = publish ? "on-sale" : form.status === "on-sale" ? "on-sale" : "draft";
    if (existing) {
      setProperties(properties.map((p) => p.id === existing.id ? { ...p, ...form, status } : p));
    } else {
      const newProp: Property = {
        id: `prop-${Date.now()}`,
        ...form,
        status,
        valueGrowth: [],
        interestCount: 0,
        clickCount: 0,
        saveCount: 0,
        campaigned: false,
      };
      setProperties([...properties, newProp]);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate("/admin/properties"); }, 1200);
  };

  const generateVideo = () => {
    setVideoStatus("generating");
    setTimeout(() => setVideoStatus("review"), 3000);
  };


  const inputCls = "w-full border border-[#ddd5c5] px-3 py-2.5 text-sm text-navy bg-white";

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/admin/properties")} className="text-stone hover:text-navy transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 className="font-display text-navy text-3xl font-bold">{existing ? `Edit: ${existing.name}` : "Add New Property"}</h1>
      </div>

      {saved && (
        <div className="bg-sage/20 border border-sage text-sage px-4 py-3 text-sm font-semibold mb-5 flex items-center gap-2">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          Saved successfully!
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-[#ddd5c5]">
        {(["details", "photos", "video"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-all -mb-px ${tab === t ? "border-amber text-amber" : "border-transparent text-stone hover:text-navy"}`}
          >
            {t === "video" ? "AI Home Tour Video" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <div className="bg-white shadow-sm p-7 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Development Name" req error={errors.name}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. The Meridian"/>
            </Field>
            <Field label="Location" req error={errors.location}>
              <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Dublin City Centre"/>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="County">
              <select className={inputCls} value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })}>
                {["Dublin", "Cork", "Galway", "Limerick", "Wicklow", "Kildare", "Meath", "Westmeath"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Full Address">
              <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. Grand Canal Dock, Dublin 2"/>
            </Field>
          </div>

          <Field label="Property Type">
            <input className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. 1, 2 & 3 Bedroom Apartments"/>
          </Field>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Price From (€)">
              <input type="number" className={inputCls} value={form.price.min} onChange={(e) => setForm({ ...form, price: { ...form.price, min: Number(e.target.value) } })}/>
            </Field>
            <Field label="Price To (€)">
              <input type="number" className={inputCls} value={form.price.max} onChange={(e) => setForm({ ...form, price: { ...form.price, max: Number(e.target.value) } })}/>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Stage">
              <select className={inputCls} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as any })}>
                {["Planning", "Under Construction", "Ready to Move"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                {["draft", "on-sale", "coming-soon", "sold-out", "offline"].map((s) => <option key={s} value={s}>{s.replace("-", " ")}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Agent" req error={errors.agent}>
              <input className={inputCls} value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })} placeholder="Agent name"/>
            </Field>
            <Field label="Listed Date">
              <input type="date" className={inputCls} value={form.listedDate} onChange={(e) => setForm({ ...form, listedDate: e.target.value })}/>
            </Field>
          </div>

          <Field label="Description" req error={errors.description}>
            <textarea className={`${inputCls} h-28 resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the development..."/>
          </Field>

          {/* Features */}
          <Field label="Features">
            <div className="flex gap-2 mb-2">
              <input className={`${inputCls} flex-1`} value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="Add a feature..." onKeyDown={(e) => { if (e.key === "Enter" && featureInput.trim()) { setForm({ ...form, features: [...form.features, featureInput.trim()] }); setFeatureInput(""); }}}/>
              <button onClick={() => { if (featureInput.trim()) { setForm({ ...form, features: [...form.features, featureInput.trim()] }); setFeatureInput(""); }}} className="bg-navy text-white px-3 text-sm hover:bg-amber transition-colors">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.features.map((f, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-cream-dark border border-[#ddd5c5] px-2.5 py-1 text-xs text-navy">
                  {f}
                  <button onClick={() => setForm({ ...form, features: form.features.filter((_, fi) => fi !== i) })} className="text-stone hover:text-red-500 transition-colors">×</button>
                </span>
              ))}
            </div>
          </Field>

          <div className="bg-amber/10 border border-amber/30 p-4 text-sm text-navy">
            <strong>Checker:</strong> Ensure all required fields are complete before publishing. Draft properties are not visible on the public site.
          </div>
        </div>
      )}

      {tab === "photos" && (
        <div className="bg-white shadow-sm p-7 space-y-5">
          <h2 className="font-display text-navy font-semibold text-lg">Property Photos</h2>
          <Field label="Main Photo URL">
            <input className={inputCls} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://images.unsplash.com/..."/>
          </Field>
          {form.image && (
            <img src={form.image} alt="Preview" className="h-40 object-cover border border-[#ddd5c5]"/>
          )}
          <Field label="Additional Photos">
            <div className="flex gap-2 mb-3">
              <input className={`${inputCls} flex-1`} value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} placeholder="https://..."/>
              <button onClick={() => { if (photoInput.trim()) { setForm({ ...form, photos: [...form.photos, photoInput.trim()] }); setPhotoInput(""); }}} className="bg-navy text-white px-3 text-sm hover:bg-amber transition-colors">Add</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {form.photos.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-full h-24 object-cover border border-[#ddd5c5]"/>
                  <button onClick={() => setForm({ ...form, photos: form.photos.filter((_, pi) => pi !== i) })} className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          </Field>
        </div>
      )}

      {tab === "video" && (
        <div className="bg-white shadow-sm p-7 space-y-5">
          <div>
            <h2 className="font-display text-navy font-semibold text-lg mb-1">AI Home Tour Video</h2>
            <p className="text-stone text-sm">Generate a cinematic AI home tour using Dashscope MCP. Describe the tour you'd like and our AI will create a video walkthrough.</p>
          </div>

          {videoStatus === "idle" && (
            <>
              <Field label="Tour Description / Prompt">
                <textarea
                  className={`${inputCls} h-32 resize-none`}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder={`e.g. "A cinematic walkthrough of ${form.name || 'the development'}, starting at the entrance gates, moving through landscaped gardens, into the bright open-plan kitchen, up to bedrooms with city views. Warm afternoon light. Smooth gimbal movement."`}
                />
              </Field>
              <button
                disabled={!videoPrompt.trim()}
                onClick={generateVideo}
                className="bg-navy text-white px-6 py-3 text-sm font-semibold hover:bg-amber transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Generate with Dashscope MCP
              </button>
            </>
          )}

          {videoStatus === "generating" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-navy border-t-amber rounded-full animate-spin mx-auto mb-4"/>
              <p className="font-semibold text-navy">Generating your AI home tour...</p>
              <p className="text-stone text-sm mt-1">Dashscope MCP is processing your prompt. This may take a minute.</p>
            </div>
          )}

          {videoStatus === "review" && (
            <div className="space-y-4">
              <div className="aspect-video bg-navy/90 flex items-center justify-center text-white relative">
                <div className="text-center">
                  <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-2 opacity-60"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <p className="text-white/70 text-sm">AI-Generated Preview</p>
                  <p className="text-white font-semibold mt-1">{form.name || "Property"} Home Tour</p>
                </div>
                <div className="absolute top-3 left-3 bg-amber text-white text-xs px-2 py-1 font-semibold">AI GENERATED · REVIEW REQUIRED</div>
              </div>
              <div className="bg-amber/10 border border-amber/30 p-4 text-sm">
                <strong>Admin Review Required:</strong> Please review the generated video carefully before publishing to the public site.
              </div>
              <Field label="Refine Prompt (optional)">
                <textarea className={`${inputCls} h-20 resize-none`} value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)}/>
              </Field>
              <div className="flex gap-3">
                <button onClick={generateVideo} className="border border-navy text-navy px-5 py-2.5 text-sm font-semibold hover:bg-navy hover:text-white transition-all">Regenerate</button>
                <button onClick={() => setVideoStatus("done")} className="bg-sage text-white px-5 py-2.5 text-sm font-semibold hover:bg-sage-light transition-colors">Approve & Save</button>
              </div>
            </div>
          )}

          {videoStatus === "done" && (
            <div className="flex items-center gap-3 p-4 bg-sage/15 border border-sage text-sage font-semibold text-sm">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              Video approved and saved to this property.
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => save(false)} className="bg-cream-dark border border-[#ddd5c5] text-navy px-6 py-2.5 text-sm font-semibold hover:bg-cream transition-colors">
          Save as Draft
        </button>
        <button onClick={() => save(true)} className="bg-amber text-white px-6 py-2.5 text-sm font-semibold hover:bg-amber-hover transition-colors">
          Publish
        </button>
        <button onClick={() => navigate("/admin/properties")} className="ml-auto text-stone hover:text-navy text-sm transition-colors">Cancel</button>
      </div>
    </div>
  );
}
