import { useApp } from "../context";
import PropertyCard from "../components/PropertyCard";

export default function SavedProperties() {
  const { savedIds, properties, nav } = useApp();
  const saved = properties.filter((p) => savedIds.includes(p.id));

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Saved Properties</h1>
          <p className="text-white/60 text-sm mt-1">{saved.length} saved development{saved.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {saved.length === 0 ? (
          <div className="text-center py-24">
            <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-5 text-stone opacity-40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            <p className="font-display text-2xl text-navy mb-2">No saved properties yet</p>
            <p className="text-stone mb-6">Click the bookmark icon on any property to save it here</p>
            <button onClick={() => nav("properties")} className="bg-amber text-white px-8 py-3 font-semibold text-sm hover:bg-amber-hover transition-colors">
              Browse Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {saved.map((p) => <PropertyCard key={p.id} property={p} showCompare />)}
          </div>
        )}
      </div>
    </div>
  );
}
