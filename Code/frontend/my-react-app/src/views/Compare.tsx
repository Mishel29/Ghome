import { useApp } from "../context";
import { useNavigate } from "react-router-dom";
import { fmt } from "../data";

export default function Compare() {
  const { compareIds, toggleCompare, properties } = useApp();
  const navigate = useNavigate();
  const selected = properties.filter((p) => compareIds.includes(p.id));

  const rows: { label: string; key: (p: typeof properties[0]) => string }[] = [
    { label: "Location", key: (p) => `${p.location}, Co. ${p.county}` },
    { label: "Type", key: (p) => p.type },
    { label: "Stage", key: (p) => p.stage },
    { label: "Price", key: (p) => p.price.min === p.price.max ? fmt(p.price.min) : `${fmt(p.price.min)} - ${fmt(p.price.max)}` },
    { label: "Bedrooms", key: (p) => p.beds.join(", ") + " bed" },
    { label: "Bathrooms", key: (p) => p.baths.join(", ") + " bath" },
    { label: "Size", key: (p) => p.sqft.min === p.sqft.max ? `${p.sqft.min.toLocaleString()} sq ft` : `${p.sqft.min.toLocaleString()} - ${p.sqft.max.toLocaleString()} sq ft` },
    { label: "Status", key: (p) => p.status.replace("-", " ") },
    { label: "Completed", key: (p) => p.completionYear ? String(p.completionYear) : "Not specified" },
  ];

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Compare Properties</h1>
          <p className="text-white/60 text-sm mt-1">Selected properties side by side</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {selected.length < 2 ? (
          <div className="text-center py-20 bg-cream-dark border border-dashed border-[#ddd5c5]">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-4 text-stone opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p className="font-display text-xl text-navy mb-1">Select at least 2 properties</p>
            <p className="text-stone text-sm">Add properties from the property listing or a property detail page.</p>
            <button onClick={() => navigate("/properties")} className="mt-5 bg-navy text-white text-sm font-semibold px-4 py-2 hover:bg-amber transition-colors">Browse Properties</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-cream-dark text-left px-5 py-4 font-semibold text-stone text-xs uppercase tracking-wider w-36 border-b border-[#ddd5c5]"/>
                  {selected.map((p) => (
                    <th key={p.id} className="bg-navy px-5 py-4 text-left border-b border-white/10 min-w-56">
                      <div className="relative">
                        <img src={p.image} alt={p.name} className="w-full h-28 object-cover mb-3 opacity-80"/>
                        <button
                          onClick={() => toggleCompare(p.id)}
                          className="absolute top-1 right-1 bg-black/50 text-white w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                        <div className="font-display text-white font-bold text-base">{p.name}</div>
                        <div className="text-white/60 text-xs">{p.location}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ label, key }, i) => (
                  <tr key={label} className={i % 2 === 0 ? "bg-cream" : "bg-cream-dark"}>
                    <td className="px-5 py-3.5 text-xs font-semibold text-stone uppercase tracking-wider border-r border-[#ddd5c5]">{label}</td>
                    {selected.map((p) => (
                      <td key={p.id} className="px-5 py-3.5 text-sm text-navy font-medium capitalize border-r border-[#ddd5c5] last:border-r-0">
                        {key(p)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-cream-dark">
                  <td className="px-5 py-4 border-r border-[#ddd5c5]"/>
                  {selected.map((p) => (
                    <td key={p.id} className="px-5 py-4 border-r border-[#ddd5c5] last:border-r-0">
                      <button
                        onClick={() => navigate(`/properties/${p.id}`)}
                        className="bg-navy text-white text-xs font-semibold px-4 py-2 hover:bg-amber transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => navigate(`/mortgage?price=${encodeURIComponent(p.price.min)}`)}
                        className="ml-2 border border-navy text-navy text-xs font-semibold px-4 py-2 hover:bg-navy hover:text-white transition-colors"
                      >
                        Mortgage Calculator
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
