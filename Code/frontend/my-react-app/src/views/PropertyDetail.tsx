import { useState } from "react";
import { useApp } from "../context";
import { fmt, type Interest } from "../data";

export default function PropertyDetail() {
  const { params, properties, nav, savedIds, toggleSave, interests, setInterests } = useApp();
  const p = properties.find((x) => x.id === params.id) ?? properties[0];
  const isSaved = savedIds.includes(p.id);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = "Valid email required";
    if (!form.message.trim()) e.message = "Message is required";
    if (!form.consent) e.consent = "You must consent to data processing";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const newInterest: Interest = {
      id: `int-${Date.now()}`,
      propertyId: p.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message,
      date: new Date().toISOString().split("T")[0],
      agent: p.agent,
      emailSent: false,
      dataConsent: form.consent,
    };
    setInterests([...interests, newInterest]);
    setFormSent(true);
  };

  const statusColors: Record<string, string> = {
    "on-sale": "bg-amber",
    "coming-soon": "bg-burgundy",
    "sold-out": "bg-stone",
    "offline": "bg-[#666]",
  };

  return (
    <div className="bg-cream min-h-screen">
      {/* Hero */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden">
        <img src={p.photos[photoIdx] ?? p.image} alt={p.name} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"/>

        {/* Property overlay card */}
        <div className="absolute bottom-10 left-10 max-w-sm" style={{ background: p.overlayColor }}>
          <div className={`inline-block ${statusColors[p.status] ?? "bg-stone"} text-white text-[11px] font-semibold px-3 py-1 uppercase tracking-wider mb-2`}>
            {p.status.replace("-", " ")}
          </div>
          <div className="p-5 pt-2">
            <h1 className="font-display text-white text-3xl font-bold">{p.name}</h1>
            <p className="text-white/80 text-sm mt-1">{p.address}</p>
          </div>
        </div>

        {/* Photo thumbnails */}
        {p.photos.length > 1 && (
          <div className="absolute bottom-6 right-6 flex gap-2">
            {p.photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className={`w-16 h-12 overflow-hidden border-2 transition-all ${i === photoIdx ? "border-amber" : "border-white/40"}`}
              >
                <img src={photo} alt="" className="w-full h-full object-cover"/>
              </button>
            ))}
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => nav("properties")}
          className="absolute top-6 left-6 bg-white/20 backdrop-blur-sm text-white flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/30 transition-all"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
      </section>

      {/* Quick actions bar */}
      <section className="bg-navy">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {[
            { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Register Interest", action: () => setShowForm(true) },
            { icon: "M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", label: "Virtual Tour", action: () => {} },
            { icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Download Brochure", action: () => {} },
            { icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z", label: isSaved ? "Saved ✓" : "Save Property", action: () => toggleSave(p.id) },
          ].map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 py-5 text-white/70 hover:text-white hover:bg-white/8 transition-all text-center px-3"
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
              </svg>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="font-display text-burgundy text-2xl font-bold mb-3">About {p.name}</h2>
            <p className="text-stone leading-relaxed">{p.description}</p>
          </div>

          {/* Key info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Type", value: p.type },
              { label: "Stage", value: p.stage },
              { label: "Price from", value: fmt(p.price.min) },
              { label: "Size from", value: `${p.sqft.min} sq ft` },
              { label: "Bedrooms", value: p.beds.join(", ") + " bed" },
              { label: "Bathrooms", value: p.baths.join(", ") + " bath" },
              { label: "Listed", value: new Date(p.listedDate).toLocaleDateString("en-IE") },
              { label: "Agent", value: p.agent },
            ].map(({ label, value }) => (
              <div key={label} className="bg-cream-dark p-4">
                <div className="text-[10px] text-stone uppercase tracking-wider mb-1">{label}</div>
                <div className="font-semibold text-navy text-sm">{value}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div>
            <h3 className="font-display text-navy font-semibold text-lg mb-3">Development Features</h3>
            <div className="grid grid-cols-2 gap-2">
              {p.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-navy">
                  <span className="w-1.5 h-1.5 bg-amber rounded-full shrink-0"/>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Contact / interest form */}
        <div className="space-y-5">
          <div className="bg-navy p-6 text-white">
            <div className="font-display text-xl font-bold mb-1">{p.name}</div>
            <div className="text-white/60 text-sm mb-4">{p.location}, Co. {p.county}</div>
            <div className="text-2xl font-bold text-amber mb-1">{fmt(p.price.min)}</div>
            <div className="text-white/60 text-xs mb-5">Starting price · Up to {fmt(p.price.max)}</div>
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-amber hover:bg-amber-hover text-white py-3 font-semibold text-sm transition-colors"
            >
              Register Your Interest
            </button>
            <button
              onClick={() => nav("mortgage")}
              className="w-full mt-2 border border-white/30 text-white/80 hover:text-white py-3 font-medium text-sm transition-colors"
            >
              Mortgage Calculator
            </button>
          </div>

          <div className="bg-cream-dark p-5">
            <div className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Your Agent</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy rounded-full flex items-center justify-center text-white font-bold text-sm">
                {p.agent.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="font-semibold text-navy text-sm">{p.agent}</div>
                <div className="text-xs text-stone">Sales Consultant</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interest modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { if (!formSent) setShowForm(false); }}>
          <div className="bg-cream w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-navy p-5 flex items-center justify-between">
              <div>
                <h3 className="font-display text-white font-bold text-lg">Register Your Interest</h3>
                <p className="text-white/60 text-xs mt-0.5">{p.name} · {p.location}</p>
              </div>
              <button onClick={() => { setShowForm(false); setFormSent(false); }} className="text-white/60 hover:text-white transition-colors">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {formSent ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" fill="none" stroke="#4A6741" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <h4 className="font-display text-navy text-xl font-bold mb-2">Interest Registered!</h4>
                <p className="text-stone text-sm">Our agent {p.agent} will be in touch within 24 hours.</p>
                <button onClick={() => { setShowForm(false); setFormSent(false); }} className="mt-6 bg-navy text-white px-8 py-2.5 text-sm font-semibold hover:bg-navy-light transition-colors">Close</button>
              </div>
            ) : (
              <form onSubmit={submit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone block mb-1.5">Full Name *</label>
                    <input className="w-full border border-[#ddd5c5] bg-white px-3 py-2.5 text-sm text-navy" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name"/>
                    {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone block mb-1.5">Phone</label>
                    <input className="w-full border border-[#ddd5c5] bg-white px-3 py-2.5 text-sm text-navy" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone block mb-1.5">Email Address *</label>
                  <input className="w-full border border-[#ddd5c5] bg-white px-3 py-2.5 text-sm text-navy" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com"/>
                  {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone block mb-1.5">Your Message *</label>
                  <textarea className="w-full border border-[#ddd5c5] bg-white px-3 py-2.5 text-sm text-navy h-24 resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you're looking for..."/>
                  {errors.message && <p className="text-[11px] text-red-600 mt-1">{errors.message}</p>}
                </div>
                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 accent-navy" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })}/>
                    <span className="text-xs text-stone leading-relaxed">
                      I consent to Harborstone Homes storing and processing my data to respond to this enquiry, in line with our <span className="underline cursor-pointer">Privacy Policy</span>.
                    </span>
                  </label>
                  {errors.consent && <p className="text-[11px] text-red-600 mt-1">{errors.consent}</p>}
                </div>
                <button type="submit" className="w-full bg-amber hover:bg-amber-hover text-white py-3 font-semibold text-sm transition-colors">
                  Submit Interest
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
