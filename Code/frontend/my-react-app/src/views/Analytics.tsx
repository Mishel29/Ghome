import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { propertyPage, viewProperty } from "../api/properties";
import type { PropertyFilterInput } from "../api/schemaTypes";
import type { Property } from "../data";
import { fmt } from "../data";

const formatNumber = (value: number) => value.toLocaleString("en-IE", { maximumFractionDigits: 2 });
const CustomTooltip = ({ active, payload, label, unit = "" }: {active?: boolean; payload?: readonly {name?: string | number; color?: string; value?: string | number}[]; label?: string | number; unit?: string}) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-navy text-white p-3 text-xs shadow-xl">
        <div className="font-semibold mb-2">{label}</div>
        {payload.map((entry) => (
          <div key={entry.name} className="flex gap-3 justify-between">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-bold">{typeof entry.value === "number" ? `${formatNumber(entry.value)}${unit}` : entry.value}</span>
          </div>
        ))}
      </div>
    );
  };


export default function Analytics() {
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [filter, setFilter] = useState<PropertyFilterInput>({});
  const [draftFilter, setDraftFilter] = useState<PropertyFilterInput>({});
  const [results, setResults] = useState<Property[]>([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [resultOffset, setResultOffset] = useState(0);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultError, setResultError] = useState("");

  useEffect(() => {
    if (!selectorOpen) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoadingResults(true);
      setResultError("");
      propertyPage(false, { ...filter, publicationStatus: "PUBLISHED" }, resultOffset, 24)
        .then((page) => { if (active) { setResults(page.nodes.map(viewProperty)); setResultTotal(page.totalCount); } })
        .catch((error) => { if (active) setResultError(error instanceof Error ? error.message : "Could not load properties"); })
        .finally(() => { if (active) setLoadingResults(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [filter, resultOffset, selectorOpen]);

  const toggle = (property: Property) => {
    setSelected((previous) => previous.includes(property.id) ? previous.filter((id) => id !== property.id) : [...previous, property.id]);
    setSelectedProperties((previous) => previous.some((item) => item.id === property.id) ? previous.filter((item) => item.id !== property.id) : [...previous, property]);
  };

  const removeSelected = (id: string) => {
    setSelected((previous) => previous.filter((item) => item !== id));
    setSelectedProperties((previous) => previous.filter((item) => item.id !== id));
  };

  const applyFilters = () => {
    setFilter(draftFilter);
    setResultOffset(0);
  };

  const clearSelection = () => {
    setSelected([]);
    setSelectedProperties([]);
  };

  const COLORS = ["#1B2A4A", "#E8761B", "#6B2B4C", "#4A6741", "#8A8070", "#243560"];

  const selectedProps = selectedProperties.filter((property) => selected.includes(property.id));

  // Build chart data: rows per year, columns per property
  const years = [...new Set(selectedProps.flatMap((p) => p.valueGrowth.map((v) => v.year)))].sort();
  const lineData = years.map((year) => {
    const row: Record<string, number | string> = { year };
    selectedProps.forEach((p) => {
      const entry = p.valueGrowth.find((v) => v.year === year);
      if (entry) row[p.name] = entry.value;
    });
    return row;
  });

  const growthData = years.slice(1).map((year) => {
    const row: Record<string, number | string> = { year };
    selectedProps.forEach((p) => {
      const entry = p.valueGrowth.find((v) => v.year === year);
      if (entry) row[p.name] = entry.growth;
    });
    return row;
  });

  const analysisRows = selectedProps.map((property) => {
    const first = property.valueGrowth[0];
    const latest = property.valueGrowth[property.valueGrowth.length - 1];
    return first && latest && first.value > 0 ? { property, latestValue: latest.value, growth: ((latest.value - first.value) / first.value) * 100 } : null;
  }).filter((row): row is { property: Property; latestValue: number; growth: number } => row !== null);
  const averageLatestValue = analysisRows.length ? analysisRows.reduce((sum, row) => sum + row.latestValue, 0) / analysisRows.length : 0;
  const averageGrowth = analysisRows.length ? analysisRows.reduce((sum, row) => sum + row.growth, 0) / analysisRows.length : 0;
  const strongestGrowth = analysisRows.reduce((strongest, row) => !strongest || row.growth > strongest.growth ? row : strongest, null as (typeof analysisRows)[number] | null);


  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Property Value Analytics</h1>
          <p className="text-white/60 text-sm mt-1">Track value growth trends across our developments</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {selectedProperties.some((p) => p.historyIsSynthetic) && <p className="mb-4 text-sm">Some stored histories are synthetic development data, not observed market prices.</p>}
        <section className="bg-cream-dark p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="font-semibold text-navy text-sm">Properties in this analysis</h2><p className="text-xs text-stone mt-1">{selectedProperties.length ? `${selectedProperties.length} selected` : "No properties selected yet"}</p></div>
            <div className="flex gap-2"><button className="bg-navy text-white px-4 py-2 text-sm font-semibold" onClick={() => { setDraftFilter(filter); setSelectorOpen(true); }}>Select properties</button>{selectedProperties.length > 0 && <button className="border border-navy text-navy px-4 py-2 text-sm" onClick={clearSelection}>Clear all</button>}</div>
          </div>
          {selectedProperties.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{selectedProperties.map((property, index) => <button key={property.id} className="px-3 py-1.5 text-xs border bg-white text-navy" onClick={() => removeSelected(property.id)}><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: COLORS[index % COLORS.length] }}/>{property.name} ×</button>)}</div>}
        </section>

        {selectedProps.length === 0 ? (
          <div className="bg-cream-dark border border-dashed border-[#ddd5c5] text-center py-24 px-6"><div className="font-display text-2xl text-navy mb-2">Your charts are ready</div><p className="text-stone text-sm mb-5">Select one or more properties to compare historical value and year-on-year growth.</p><button className="bg-amber text-white px-5 py-2.5 text-sm font-semibold" onClick={() => { setDraftFilter(filter); setSelectorOpen(true); }}>Choose properties</button></div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {selectedProps.slice(0, 4).map((p) => {
                const latest = p.valueGrowth[p.valueGrowth.length - 1];
                const first = p.valueGrowth[0];
                if (!latest || !first) return <div key={p.id} className="bg-cream-dark p-5">{p.name}: historical values are unavailable.</div>;
                const totalGrowth = first.value > 0 ? ((latest.value - first.value) / first.value * 100).toFixed(1) : null;
                return (
                  <div key={p.id} className="bg-cream-dark p-5 border-l-4 border-amber">
                    <div className="text-xs text-stone mb-1">{p.name}</div>
                    <div className="font-display text-xl font-bold text-navy">{fmt(latest.value)}</div>
                    <div className="text-xs text-sage font-semibold mt-1">{totalGrowth == null ? "Growth unavailable" : `${formatNumber(Number(totalGrowth))}% since ${first.year}`}</div>
                    <div className="text-[10px] text-stone mt-0.5">Change from previous recorded year: {formatNumber(latest.growth)}%</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-cream-dark p-5"><div className="text-xs text-stone uppercase">Average latest value</div><div className="font-display text-xl font-bold text-navy mt-1">{averageLatestValue ? `€${formatNumber(averageLatestValue)}` : "—"}</div><div className="text-xs text-stone mt-1">Across {analysisRows.length} selected properties</div></div>
              <div className="bg-cream-dark p-5"><div className="text-xs text-stone uppercase">Average long-term growth</div><div className="font-display text-xl font-bold text-sage mt-1">{analysisRows.length ? `${formatNumber(averageGrowth)}%` : "—"}</div><div className="text-xs text-stone mt-1">Earliest to latest recorded value</div></div>
              <div className="bg-cream-dark p-5"><div className="text-xs text-stone uppercase">Strongest growth</div><div className="font-display text-lg font-bold text-navy mt-1">{strongestGrowth ? strongestGrowth.property.name : "—"}</div><div className="text-xs text-stone mt-1">{strongestGrowth ? `${formatNumber(strongestGrowth.growth)}% total growth` : "Historical data unavailable"}</div></div>
            </div>

            {/* Line chart - value */}
            <div className="bg-cream-dark p-6 mb-6">
              <h2 className="font-display text-navy font-semibold text-lg mb-5">Property Value Over Time</h2>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd5c5"/>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#8A8070" }}/>
                  <YAxis tickFormatter={(v) => "€" + (v / 1000) + "k"} tick={{ fontSize: 11, fill: "#8A8070" }} width={60}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{ fontSize: "12px" }}/>
                  {selectedProps.map((p, i) => (
                    <Line key={p.id} type="monotone" dataKey={p.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4, fill: COLORS[i % COLORS.length] }}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart - YoY growth */}
            <div className="bg-cream-dark p-6">
              <h2 className="font-display text-navy font-semibold text-lg mb-5">Year-on-Year Growth (%)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd5c5"/>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#8A8070" }}/>
                  <YAxis tickFormatter={(v) => v + "%"} tick={{ fontSize: 11, fill: "#8A8070" }} width={40}/>
                  <Tooltip content={<CustomTooltip unit="%"/>}/>
                  <Legend wrapperStyle={{ fontSize: "12px" }}/>
                  {selectedProps.map((p, i) => (
                    <Bar key={p.id} dataKey={p.name} fill={COLORS[i % COLORS.length]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
      {selectorOpen && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Select properties for analytics" onClick={() => setSelectorOpen(false)}><div className="bg-cream w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}><div className="bg-navy text-white p-5 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Select properties</h2><p className="text-white/60 text-xs mt-1">Search and filter the catalogue, then select the properties to compare.</p></div><button className="text-white/70 hover:text-white text-2xl" aria-label="Close property selector" onClick={() => setSelectorOpen(false)}>×</button></div><div className="p-5 border-b border-[#ddd5c5] grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><label className="text-xs text-stone">Search<input className="w-full border bg-white p-2 mt-1" value={draftFilter.search ?? ""} onChange={(event) => setDraftFilter({ ...draftFilter, search: event.target.value })} placeholder="Name, location, county" /></label><label className="text-xs text-stone">Property type<select className="w-full border bg-white p-2 mt-1" value={draftFilter.type ?? ""} onChange={(event) => setDraftFilter({ ...draftFilter, type: event.target.value || undefined })}><option value="">All types</option><option>House</option><option>Apartment</option></select></label><label className="text-xs text-stone">Sale type<select className="w-full border bg-white p-2 mt-1" value={draftFilter.saleType ?? ""} onChange={(event) => setDraftFilter({ ...draftFilter, saleType: event.target.value || undefined })}><option value="">All sale types</option><option>New</option><option>Second hand</option></select></label><label className="text-xs text-stone">Sort<select className="w-full border bg-white p-2 mt-1" value={draftFilter.sort ?? "latest"} onChange={(event) => setDraftFilter({ ...draftFilter, sort: event.target.value })}><option value="latest">Latest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label><label className="text-xs text-stone">Min price<input type="number" min="0" className="w-full border bg-white p-2 mt-1" value={draftFilter.minPrice ?? ""} onChange={(event) => setDraftFilter({ ...draftFilter, minPrice: event.target.value ? Number(event.target.value) : undefined })} /></label><label className="text-xs text-stone">Max price<input type="number" min="0" className="w-full border bg-white p-2 mt-1" value={draftFilter.maxPrice ?? ""} onChange={(event) => setDraftFilter({ ...draftFilter, maxPrice: event.target.value ? Number(event.target.value) : undefined })} /></label><label className="text-xs text-stone">Min bedrooms<input type="number" min="0" className="w-full border bg-white p-2 mt-1" value={draftFilter.minBedrooms ?? ""} onChange={(event) => setDraftFilter({ ...draftFilter, minBedrooms: event.target.value ? Number(event.target.value) : undefined })} /></label><div className="flex items-end"><button className="bg-amber text-white px-4 py-2 text-sm font-semibold" onClick={applyFilters}>Apply filters</button></div></div><div className="p-5 overflow-y-auto flex-1"><div className="flex justify-between text-xs text-stone mb-3"><span>{resultTotal.toLocaleString()} published properties found</span><span>{selectedProperties.length} selected</span></div>{resultError && <p className="text-red-700 text-sm mb-3">{resultError}</p>}{loadingResults ? <p className="py-12 text-center text-stone">Loading properties…</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{results.map((property) => { const isSelected = selected.includes(property.id); return <button key={property.id} className={`text-left border p-4 bg-white ${isSelected ? "border-amber ring-1 ring-amber" : "border-[#ddd5c5]"}`} onClick={() => toggle(property)}><div className="flex gap-3"><span className={`mt-0.5 w-4 h-4 border shrink-0 flex items-center justify-center ${isSelected ? "bg-amber border-amber" : "border-stone"}`}>{isSelected && <span className="text-white text-xs">✓</span>}</span><span><strong className="text-sm text-navy">{property.name}</strong><span className="block text-xs text-stone mt-1">{property.location || property.county || "Location unavailable"} · {property.type || "Property"}</span><span className="block text-xs text-stone mt-1">{property.price.min ? fmt(property.price.min) : "Price unavailable"} · {property.completionYear ? `Completed ${property.completionYear}` : "Year unavailable"}</span></span></div></button>; })}</div>}{!loadingResults && !results.length && <p className="py-12 text-center text-stone">No published properties match these filters.</p>}</div><div className="p-4 border-t border-[#ddd5c5] flex justify-between items-center"><button className="border border-navy px-4 py-2 text-sm" disabled={resultOffset === 0} onClick={() => setResultOffset(Math.max(0, resultOffset - 24))}>Previous</button><span className="text-xs text-stone">Showing {resultTotal ? resultOffset + 1 : 0}–{Math.min(resultOffset + results.length, resultTotal)}</span><button className="border border-navy px-4 py-2 text-sm" disabled={resultOffset + 24 >= resultTotal} onClick={() => setResultOffset(resultOffset + 24)}>Next</button><button className="bg-navy text-white px-4 py-2 text-sm font-semibold" onClick={() => setSelectorOpen(false)}>Done</button></div></div></div>}
    </div>
  );
}
