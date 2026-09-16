import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useApp } from "../context";
import { fmt } from "../data";

export default function Analytics() {
  const { properties } = useApp();
  const [selected, setSelected] = useState<string[]>(properties.slice(0, 3).map((p) => p.id));

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const COLORS = ["#1B2A4A", "#E8761B", "#6B2B4C", "#4A6741", "#8A8070", "#243560"];

  const selectedProps = properties.filter((p) => selected.includes(p.id));

  // Build chart data: rows per year, columns per property
  const years = ["2020", "2021", "2022", "2023", "2024", "2025"];
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-navy text-white p-3 text-xs shadow-xl">
        <div className="font-semibold mb-2">{label}</div>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex gap-3 justify-between">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-bold">{typeof entry.value === "number" && entry.value > 1000 ? fmt(entry.value) : entry.value + "%"}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">Property Value Analytics</h1>
          <p className="text-white/60 text-sm mt-1">Track value growth trends across our developments</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Property selector */}
        <div className="bg-cream-dark p-5 mb-8">
          <h2 className="font-semibold text-navy text-sm mb-3">Select Developments to Compare</h2>
          <div className="flex flex-wrap gap-2">
            {properties.map((p, i) => {
              const isOn = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition-all"
                  style={{
                    borderColor: isOn ? COLORS[i % COLORS.length] : "#ddd5c5",
                    background: isOn ? COLORS[i % COLORS.length] + "22" : "transparent",
                    color: isOn ? COLORS[i % COLORS.length] : "#8A8070",
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }}/>
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {selectedProps.length === 0 ? (
          <div className="text-center py-16 text-stone">Select at least one development above</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {selectedProps.slice(0, 4).map((p) => {
                const latest = p.valueGrowth[p.valueGrowth.length - 1];
                const first = p.valueGrowth[0];
                const totalGrowth = ((latest.value - first.value) / first.value * 100).toFixed(1);
                return (
                  <div key={p.id} className="bg-cream-dark p-5 border-l-4 border-amber">
                    <div className="text-xs text-stone mb-1">{p.name}</div>
                    <div className="font-display text-xl font-bold text-navy">{fmt(latest.value)}</div>
                    <div className="text-xs text-sage font-semibold mt-1">+{totalGrowth}% since 2020</div>
                    <div className="text-[10px] text-stone mt-0.5">YoY: +{latest.growth}%</div>
                  </div>
                );
              })}
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
                  <Tooltip content={<CustomTooltip/>}/>
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
    </div>
  );
}
