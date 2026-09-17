import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../context";
import PropertyCard from "../components/PropertyCard";
import { fmt } from "../data";

const COUNTIES = ["All", "Dublin", "Cork", "Galway", "Limerick", "Wicklow", "Kildare"];
const STAGES = ["All", "Planning", "Under Construction", "Ready to Move"];
const STATUS = ["All", "on-sale", "coming-soon", "sold-out"];

export default function PropertiesList() {
  const { properties } = useApp();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const [county, setCounty] = useState("All");
  const [stage, setStage] = useState("All");
  const [status, setStatus] = useState("All");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [minBeds, setMinBeds] = useState(0);
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
  setSearch(urlSearch);
}, [urlSearch]);

  const filtered = useMemo(() => {
    let list = properties.filter((p) => p.status !== "offline" && p.status !== "draft");
    if (search) list = list.filter((p) => `${p.name} ${p.location} ${p.county}`.toLowerCase().includes(search.toLowerCase()));
    if (county !== "All") list = list.filter((p) => p.county === county);
    if (stage !== "All") list = list.filter((p) => p.stage === stage);
    if (status !== "All") list = list.filter((p) => p.status === status);
    list = list.filter((p) => p.price.min >= minPrice && p.price.max <= (maxPrice || 9999999));
    if (minBeds > 0) list = list.filter((p) => p.beds.some((b) => b >= minBeds));
    if (sort === "latest") list = [...list].sort((a, b) => b.listedDate.localeCompare(a.listedDate));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price.min - b.price.min);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price.max - a.price.max);
    return list;
  }, [properties, search, county, stage, status, minPrice, maxPrice, minBeds, sort]);

  return (
    <div className="bg-cream min-h-screen">
      {/* Page header */}
      <div className="bg-navy py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Find Your New Home</h1>
          <p className="text-white/60 text-sm mt-1">{filtered.length} development{filtered.length !== 1 ? "s" : ""} available</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="bg-cream-dark p-5 space-y-5">
            <h2 className="font-display font-semibold text-navy text-base">Filter Properties</h2>

            {/* Search */}
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Search</label>
              <input
                className="w-full px-3 py-2 border border-[#ddd5c5] bg-cream text-sm text-navy placeholder-stone"
                placeholder="Location or development..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Status</label>
              <div className="space-y-1.5">
                {STATUS.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer text-sm text-navy">
                    <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} className="accent-amber"/>
                    {s === "All" ? "All" : s.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>

            {/* County */}
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">County</label>
              <select
                className="w-full px-3 py-2 border border-[#ddd5c5] bg-cream text-sm text-navy"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              >
                {COUNTIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Price range */}
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-1/2 px-2 py-2 border border-[#ddd5c5] bg-cream text-xs text-navy"
                  value={minPrice || ""}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-1/2 px-2 py-2 border border-[#ddd5c5] bg-cream text-xs text-navy"
                  value={maxPrice === 1000000 ? "" : maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 1000000)}
                />
              </div>
              <div className="text-[11px] text-stone mt-1">
                {minPrice > 0 ? fmt(minPrice) : "Any"} – {maxPrice < 1000000 ? fmt(maxPrice) : "Any"}
              </div>
            </div>

            {/* Beds */}
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Min Bedrooms</label>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4].map((b) => (
                  <button
                    key={b}
                    onClick={() => setMinBeds(b)}
                    className={`w-9 h-9 text-sm border transition-all ${minBeds === b ? "bg-navy text-white border-navy" : "border-[#ddd5c5] text-navy hover:border-navy"}`}
                  >
                    {b === 0 ? "Any" : b}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Stage</label>
              <select
                className="w-full px-3 py-2 border border-[#ddd5c5] bg-cream text-sm text-navy"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <button
              onClick={() => { setCounty("All"); setStage("All"); setStatus("All"); setMinPrice(0); setMaxPrice(1000000); setMinBeds(0); setSearch(""); }}
              className="w-full py-2 border border-navy text-navy text-xs font-semibold hover:bg-navy hover:text-white transition-all"
            >
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-5">
            <span className="text-stone text-sm">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
            <select
              className="px-3 py-2 border border-[#ddd5c5] bg-cream text-sm text-navy"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="latest">Latest Listed</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-stone">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-4 opacity-30">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
              </svg>
              <p className="font-display text-xl text-navy mb-1">No results found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => <PropertyCard key={p.id} property={p} showCompare />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
