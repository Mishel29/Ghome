import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { propertyPage, viewProperty } from "../api/properties";
import type { Property } from "../data";
import type { PropertyFilterInput } from "../api/schemaTypes";
import PropertyCard from "../components/PropertyCard";
import { fmt } from "../data";

const COUNTIES = ["All", "Dublin"];
const STAGES = ["All", "Ready to Move"];
const STATUS = ["All", "on-sale"];
const TYPES = ["All", "House", "Apartment"];
const SALE_TYPES = ["All", "New", "Second hand", "Third hand", "Fourth hand"];

export default function PropertiesList() {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const raw=searchParams.get("filters")??"{}";
  let initial:PropertyFilterInput={};try{initial=JSON.parse(raw) as PropertyFilterInput;}catch{ /* ignore malformed shared search */ }
  return <PropertyResults key={urlSearch+raw} initialSearch={urlSearch} initial={initial} />;
}
function PropertyResults({ initialSearch, initial }: { initialSearch: string; initial:PropertyFilterInput }) {
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [total, setTotal] = useState(0); const [page, setPage] = useState({ filter: "", offset: 0 }); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [county, setCounty] = useState(initial.county ?? "All");
  const [stage, setStage] = useState(initial.stage === "READY_TO_MOVE" ? "Ready to Move" : initial.stage === "UNDER_CONSTRUCTION" ? "Under Construction" : initial.stage === "PLANNING" ? "Planning" : "All");
  const [status, setStatus] = useState(initial.status?.toLowerCase().replaceAll("_","-") ?? "All");
  const [minPrice, setMinPrice] = useState(initial.minPrice??0);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice??1000000);
  const [minBeds, setMinBeds] = useState(initial.minBedrooms??0);
  const [sort, setSort] = useState(initial.sort??"latest");
  const [type, setType] = useState(initial.type ?? "All");
  const [saleType, setSaleType] = useState(initial.saleType ?? "All");
  const [search, setSearch] = useState(initial.search??initialSearch);
  const [extra,setExtra]=useState({location:initial.location??"",postalCode:initial.postalCode??"",maxBedrooms:initial.maxBedrooms,minBathrooms:initial.minBathrooms,maxBathrooms:initial.maxBathrooms});

  const filter = useMemo<PropertyFilterInput>(() => ({ ...extra, search: search || undefined,
    county: county === "All" ? undefined : county,
    status: status === "All" ? undefined : status.toUpperCase().replaceAll("-", "_") as PropertyFilterInput["status"],
    stage: stage === "All" ? undefined : stage.toUpperCase().replaceAll(" ", "_") as PropertyFilterInput["stage"],
    minPrice: minPrice || undefined, maxPrice: maxPrice === 1000000 ? undefined : maxPrice,
    minBedrooms: minBeds || undefined, type: type === "All" ? undefined : type, saleType: saleType === "All" ? undefined : saleType, sort,
  }), [search, county, status, stage, minPrice, maxPrice, minBeds, type, saleType, sort, extra]);
  const filterKey = JSON.stringify(filter);
  const offset = page.filter === filterKey ? page.offset : 0;
  const setOffset = (offset: number) => setPage({ filter: filterKey, offset });
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => { setLoading(true); setError(""); propertyPage(false, filter, offset, 24).then((page) => { if (alive) { setFiltered(page.nodes.map(viewProperty)); setTotal(page.totalCount); } }).catch((e) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); }, 200);
    return () => { alive = false; clearTimeout(timer); };
  }, [filter, offset]);
  return (
    <div className="bg-cream min-h-screen">
      {/* Page header */}
      <div className="bg-navy py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Find Your New Home</h1>
          <p className="text-white/60 text-sm mt-1">{total} development{filtered.length !== 1 ? "s" : ""} available</p>
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

            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Property Type</label>
              <select className="w-full px-3 py-2 border border-[#ddd5c5] bg-cream text-sm text-navy" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((value) => <option key={value}>{value}</option>)}</select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Sale Type</label>
              <select className="w-full px-3 py-2 border border-[#ddd5c5] bg-cream text-sm text-navy" value={saleType} onChange={(e) => setSaleType(e.target.value)}>{SALE_TYPES.map((value) => <option key={value}>{value}</option>)}</select>
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

            <div className="space-y-3">
              <label className="block text-xs">Location<input aria-label="Location" className="w-full border p-2" value={extra.location} onChange={(e)=>setExtra({...extra,location:e.target.value})}/></label>
              <label className="block text-xs">Postal code<input aria-label="Postal code" className="w-full border p-2" placeholder="e.g. Dublin 6" value={extra.postalCode} onChange={(e)=>setExtra({...extra,postalCode:e.target.value})}/></label>
              {([['maxBedrooms','Max bedrooms'],['minBathrooms','Min bathrooms'],['maxBathrooms','Max bathrooms']] as const).map(([key,label])=><label key={key} className="block text-xs">{label}<input aria-label={label} type="number" min="0" className="w-full border p-2" value={extra[key]??''} onChange={(e)=>setExtra({...extra,[key]:e.target.value?Number(e.target.value):undefined})}/></label>)}
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
              onClick={() => { setCounty("All"); setStage("All"); setStatus("All"); setType("All"); setSaleType("All"); setMinPrice(0); setMaxPrice(1000000); setMinBeds(0); setSearch(""); setExtra({location:"",postalCode:"",maxBedrooms:undefined,minBathrooms:undefined,maxBathrooms:undefined}); }}
              className="w-full py-2 border border-navy text-navy text-xs font-semibold hover:bg-navy hover:text-white transition-all"
            >
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-5">
            <span className="text-stone text-sm">{total} result{filtered.length !== 1 ? "s" : ""}</span>
            <select
              className="px-3 py-2 border border-[#ddd5c5] bg-cream text-sm text-navy"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="latest">Latest Listed</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {error ? <p role="alert" className="text-red-700">{error}</p> : loading ? <p>Loading properties…</p> : filtered.length === 0 ? (
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
          {total > 24 && <div className="flex items-center gap-4 mt-6"><button disabled={offset === 0 || loading} onClick={() => setOffset(offset-24)} className="border px-4 py-2 disabled:opacity-40">Previous</button><span>{offset+1}–{Math.min(offset+24,total)} of {total}</span><button disabled={offset+24 >= total || loading} onClick={() => setOffset(offset+24)} className="border px-4 py-2 disabled:opacity-40">Next</button></div>}
        </div>
      </div>
    </div>
  );
}

