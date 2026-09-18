import { useApp } from "../context";
import { useNavigate } from "react-router-dom";
import { fmt, type Property } from "../data";

const statusLabel: Record<string, { label: string; bg: string }> = {
  "on-sale":      { label: "On sale",      bg: "bg-amber" },
  "coming-soon":  { label: "Coming soon",  bg: "bg-burgundy" },
  "sold-out":     { label: "Sold out",     bg: "bg-stone" },
  "offline":      { label: "Offline",      bg: "bg-[#666]" },
  "draft":        { label: "Draft",        bg: "bg-[#888]" },
};

interface Props {
  property: Property;
  showCompare?: boolean;
}

export default function PropertyCard({ property: p, showCompare = false }: Props) {
  const { savedIds, toggleSave, compareIds, toggleCompare } = useApp();
  const navigate = useNavigate();
  const badge = statusLabel[p.status] ?? { label: p.status, bg: "bg-stone" };
  const isSaved = savedIds.includes(p.id);
  const isCompared = compareIds.includes(p.id);
  const priceLabel = p.price.min === p.price.max ? fmt(p.price.min) : `${fmt(p.price.min)}–${fmt(p.price.max)}`;
  const propertyType = p.type || "Property";
  const saleType = p.saleType || "New homes";
  const completionLabel = p.completionYear ? `Completed ${p.completionYear}` : null;

  return (
    <div className="bg-cream-dark flex flex-col group cursor-pointer" onClick={() => navigate(`/properties/${p.id}`)}>
      {/* Image */}
      <div className="relative property-img-wrap aspect-[4/3] overflow-hidden">
        <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy"/>

        {/* Status badge */}
        <div className={`absolute top-3 left-3 ${badge.bg} text-white text-[11px] font-semibold px-2.5 py-1 uppercase tracking-wider`}>
          {badge.label}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
              toggleSave(p.id);
            }}
          className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center backdrop-blur-sm transition-all ${isSaved ? "bg-amber text-white" : "bg-black/40 text-white hover:bg-amber"}`}
          title={isSaved ? "Remove from saved" : "Save property"}
        >
          <svg width="14" height="14" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: p.overlayColor }}>
          <div className="font-display text-white font-bold text-lg leading-tight">{p.name}</div>
          <div className="text-white/85 text-xs mt-0.5">{p.location}, Co. {p.county}</div>
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="flex items-start justify-between gap-3 border-b border-[#ddd5c5] pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-navy leading-snug">{propertyType}</p>
              <span className="bg-navy/5 text-navy px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{saleType}</span>
            </div>
            {completionLabel && <p className="text-xs text-stone mt-1">{completionLabel}</p>}
          </div>
          <span className="text-base font-bold text-navy whitespace-nowrap">{priceLabel}</span>
        </div>
        <div className="flex gap-2 flex-wrap text-xs text-stone">
          <span className="bg-cream px-2 py-1">{p.beds.join(", ")} bed</span>
          <span className="bg-cream px-2 py-1">{p.baths.join(", ")} bath</span>
          {p.sqft.min > 0 && <span className="bg-cream px-2 py-1">{p.sqft.min.toLocaleString()} sq ft</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#ddd5c5]">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={(e) => {e.stopPropagation(); navigate(`/properties/${p.id}`);}}
              className="text-xs font-semibold text-navy hover:text-amber flex items-center gap-1 transition-colors"
            >
              View {p.name}
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          {showCompare && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCompare(p.id); }}
              className={`text-[11px] px-2 py-1 border transition-all ${isCompared ? "border-amber bg-amber text-white" : "border-navy/30 text-navy/70 hover:border-amber hover:text-amber"}`}
            >
              {isCompared ? "✓ Compare" : "+ Compare"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
