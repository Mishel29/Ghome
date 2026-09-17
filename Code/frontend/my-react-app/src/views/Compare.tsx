import { useApp } from "../context";
import { useNavigate } from "react-router-dom";
import { fmt } from "../data";

export default function Compare() {
  const { compareIds, toggleCompare, properties} = useApp();
  const navigate = useNavigate();
  const selected = properties.filter((p) => compareIds.includes(p.id));

  const rows: { label: string; key: (p: typeof properties[0]) => string }[] = [
    { label: "Location", key: (p) => `${p.location}, Co. ${p.county}` },
    { label: "Type", key: (p) => p.type },
    { label: "Stage", key: (p) => p.stage },
    { label: "Price from", key: (p) => fmt(p.price.min) },
    { label: "Price to", key: (p) => fmt(p.price.max) },
    { label: "Bedrooms", key: (p) => p.beds.join(", ") + " bed" },
    { label: "Bathrooms", key: (p) => p.baths.join(", ") + " bath" },
    { label: "Size from", key: (p) => `${p.sqft.min} sq ft` },
    { label: "Size to", key: (p) => `${p.sqft.max} sq ft` },
    { label: "Status", key: (p) => p.status.replace("-", " ") },
    { label: "Agent", key: (p) => p.agent },
    { label: "Listed", key: (p) => new Date(p.listedDate).toLocaleDateString("en-IE") },
  ];

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Compare Properties</h1>
          <p className="text-white/60 text-sm mt-1">Select up to 3 properties to compare side by side</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Property selector */}
        <div className="mb-8">
          <h2 className="font-display text-burgundy text-xl font-bold mb-4">
            {selected.length === 0 ? "Select properties to compare" : `Comparing ${selected.length} of 3`}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {properties.filter((p) => p.status !== "offline" && p.status !== "draft").map((p) => {
              const isSelected = compareIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleCompare(p.id)}
                  className={`flex items-center gap-2 p-3 border text-left transition-all text-sm ${isSelected ? "border-amber bg-amber/10 text-navy" : "border-[#ddd5c5] bg-cream-dark text-stone hover:border-navy hover:text-navy"}`}
                >
                  <span className={`w-4 h-4 border flex items-center justify-center shrink-0 ${isSelected ? "border-amber bg-amber" : "border-stone"}`}>
                    {isSelected && <svg width="10" height="10" fill="white" viewBox="0 0 12 12"><path d="M10 3L5 9 2 6"/></svg>}
                  </span>
                  <span className="font-medium leading-tight">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selected.length < 2 ? (
          <div className="text-center py-20 bg-cream-dark border border-dashed border-[#ddd5c5]">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-4 text-stone opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p className="font-display text-xl text-navy mb-1">Select at least 2 properties</p>
            <p className="text-stone text-sm">Use the checkboxes above or the +Compare button on property cards</p>
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
                        onClick={() => navigate(`/property/${p.id}`)}
                        className="bg-navy text-white text-xs font-semibold px-4 py-2 hover:bg-amber transition-colors"
                      >
                        View Details
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
