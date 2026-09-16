import { useState } from "react";
import { useApp } from "../../context";
import { fmt } from "../../data";

const COUNTIES = ["All", "Dublin", "Cork", "Galway", "Limerick", "Wicklow", "Kildare"];
const STATUS_OPTS = ["All", "on-sale", "coming-soon", "sold-out", "offline", "draft"];

export default function AdminProperties() {
  const { properties, setProperties, nav } = useApp();
  const [county, setCounty] = useState("All");
  const [status, setStatus] = useState("All");
  const [minBeds, setMinBeds] = useState(0);
  const [stage, setStage] = useState("All");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("list");

  const filtered = properties
    .filter((p) => {
      if (county !== "All" && p.county !== county) return false;
      if (status !== "All" && p.status !== status) return false;
      if (stage !== "All" && p.stage !== stage) return false;
      if (minBeds > 0 && !p.beds.some((b) => b >= minBeds)) return false;
      if (search && !`${p.name} ${p.location}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  const confirmDelete = (id: string) => {
    setProperties(properties.filter((p) => p.id !== id));
    setDeleteId(null);
  };

  const updateStatus = (id: string, newStatus: string) => {
    setProperties(properties.map((p) => p.id === id ? { ...p, status: newStatus as any } : p));
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      "on-sale": "bg-amber/15 text-amber-hover",
      "coming-soon": "bg-burgundy/15 text-burgundy",
      "sold-out": "bg-stone/20 text-stone",
      "offline": "bg-red-100 text-red-600",
      "draft": "bg-blue-50 text-blue-600",
    };
    return map[s] ?? "bg-gray-100 text-gray-600";
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-navy text-3xl font-bold">Property Management</h1>
          <p className="text-stone text-sm mt-1">{filtered.length} of {properties.length} properties</p>
        </div>
        <button
          onClick={() => nav("admin-property-form")}
          className="bg-amber text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-hover transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Add Property
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 shadow-sm flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Search</label>
          <input className="border border-[#ddd5c5] px-3 py-2 text-sm w-44" placeholder="Name or location..." value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Status</label>
          <select className="border border-[#ddd5c5] px-3 py-2 text-sm bg-white" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">County</label>
          <select className="border border-[#ddd5c5] px-3 py-2 text-sm bg-white" value={county} onChange={(e) => setCounty(e.target.value)}>
            {COUNTIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Stage</label>
          <select className="border border-[#ddd5c5] px-3 py-2 text-sm bg-white" value={stage} onChange={(e) => setStage(e.target.value)}>
            {["All", "Planning", "Under Construction", "Ready to Move"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Min Beds</label>
          <select className="border border-[#ddd5c5] px-3 py-2 text-sm bg-white" value={minBeds} onChange={(e) => setMinBeds(Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map((b) => <option key={b} value={b}>{b === 0 ? "Any" : b + "+"}</option>)}
          </select>
        </div>
        <button onClick={() => { setCounty("All"); setStatus("All"); setStage("All"); setMinBeds(0); setSearch(""); }} className="px-3 py-2 border border-navy text-navy text-xs font-semibold hover:bg-navy hover:text-white transition-all">
          Clear
        </button>
        <div className="ml-auto flex gap-1">
          <button onClick={() => setView("list")} className={`p-2 border ${view === "list" ? "bg-navy text-white border-navy" : "border-[#ddd5c5] text-stone"}`}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          </button>
          <button onClick={() => setView("grid")} className={`p-2 border ${view === "grid" ? "bg-navy text-white border-navy" : "border-[#ddd5c5] text-stone"}`}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
        </div>
      </div>

      {/* List view */}
      {view === "list" && (
        <div className="bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-cream-dark border-b border-[#ddd5c5]">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-stone uppercase tracking-wider">Property</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider hidden md:table-cell">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider hidden lg:table-cell">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider hidden md:table-cell">Interests</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE5D5]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-cream/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-12 h-9 object-cover shrink-0"/>
                      <div>
                        <div className="font-semibold text-navy">{p.name}</div>
                        <div className="text-[11px] text-stone">{p.location}, Co. {p.county}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-navy hidden md:table-cell whitespace-nowrap">
                    {fmt(p.price.min)}–{fmt(p.price.max)}
                  </td>
                  <td className="px-4 py-4 text-stone text-xs hidden lg:table-cell">{p.stage}</td>
                  <td className="px-4 py-4">
                    <select
                      className={`text-xs font-semibold px-2 py-1 border-0 ${statusBadge(p.status)} cursor-pointer`}
                      value={p.status}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
                    >
                      {["on-sale", "coming-soon", "sold-out", "offline", "draft"].map((s) => <option key={s} value={s}>{s.replace("-", " ")}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-stone text-sm hidden md:table-cell">{p.interestCount}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => nav("admin-property-form", { id: p.id })}
                        className="text-xs text-navy border border-navy/30 px-3 py-1.5 hover:bg-navy hover:text-white transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="text-xs text-red-500 border border-red-200 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-stone text-sm">No properties match your filters</div>
          )}
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white shadow-sm overflow-hidden">
              <div className="relative">
                <img src={p.image} alt={p.name} className="w-full h-40 object-cover"/>
                <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2.5 py-1 ${statusBadge(p.status)}`}>
                  {p.status.replace("-", " ")}
                </span>
              </div>
              <div className="p-4">
                <div className="font-semibold text-navy">{p.name}</div>
                <div className="text-xs text-stone mb-2">{p.location} · {p.stage}</div>
                <div className="text-sm font-bold text-amber mb-3">{fmt(p.price.min)}–{fmt(p.price.max)}</div>
                <div className="flex gap-2">
                  <button onClick={() => nav("admin-property-form", { id: p.id })} className="flex-1 text-xs border border-navy text-navy py-1.5 hover:bg-navy hover:text-white transition-all">Edit</button>
                  <button onClick={() => setDeleteId(p.id)} className="flex-1 text-xs border border-red-300 text-red-500 py-1.5 hover:bg-red-500 hover:text-white transition-all">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-display text-navy text-lg font-bold mb-2">Delete Property?</h3>
            <p className="text-stone text-sm mb-5">This action cannot be undone. The property and all associated data will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-[#ddd5c5] text-navy py-2.5 text-sm font-medium hover:bg-cream transition-colors">Cancel</button>
              <button onClick={() => confirmDelete(deleteId)} className="flex-1 bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
