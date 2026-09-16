import { useState } from "react";
import { useApp } from "../../context";

export default function AdminInterests() {
  const { interests, setInterests, properties } = useApp();
  const [propFilter, setPropFilter] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [emailContent, setEmailContent] = useState(`Dear {{name}},\n\nThank you for your interest in {{property}}. Our agent {{agent}} will be in touch shortly to discuss your requirements.\n\nBest regards,\nHarborstone Homes`);
  const [selected, setSelected] = useState<string[]>([]);

  const agents = ["All", ...Array.from(new Set(interests.map((i) => i.agent)))];

  const propCounts = properties.reduce((acc: Record<string, number>, p) => {
    acc[p.id] = interests.filter((i) => i.propertyId === p.id && !i.emailSent).length;
    return acc;
  }, {});

  const filtered = interests.filter((i) => {
    if (propFilter !== "All" && i.propertyId !== propFilter) return false;
    if (agentFilter !== "All" && i.agent !== agentFilter) return false;
    if (dateFrom && i.date < dateFrom) return false;
    if (dateTo && i.date > dateTo) return false;
    return true;
  });

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const sendEmails = () => {
    setInterests(interests.map((i) =>
      selected.includes(i.id) ? { ...i, emailSent: true } : i
    ));
    setSelected([]);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-navy text-3xl font-bold">Interests Management</h1>
        <p className="text-stone text-sm mt-1">{interests.filter((i) => !i.emailSent).length} pending follow-up · {interests.filter((i) => i.emailSent).length} contacted</p>
      </div>

      {/* Property cards with interest counts */}
      <div>
        <h2 className="font-display text-navy font-semibold text-base mb-3">Interests by Property</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {properties.map((p) => {
            const total = interests.filter((i) => i.propertyId === p.id).length;
            const pending = propCounts[p.id] ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => setPropFilter(propFilter === p.id ? "All" : p.id)}
                className={`bg-white shadow-sm p-4 text-left transition-all border-l-4 hover:shadow-md ${propFilter === p.id ? "border-amber" : "border-transparent"}`}
              >
                <img src={p.image} alt={p.name} className="w-full h-24 object-cover mb-3"/>
                <div className="font-semibold text-navy text-sm">{p.name}</div>
                <div className="text-xs text-stone mb-2">{p.location}</div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="font-display text-2xl font-bold text-navy">{total}</span>
                    <span className="text-xs text-stone ml-1">total</span>
                  </div>
                  {pending > 0 && (
                    <span className="bg-amber text-white text-[11px] font-bold px-2 py-0.5">{pending} pending</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters + list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter bar */}
          <div className="bg-white shadow-sm p-4 flex flex-wrap gap-3">
            <div>
              <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Property</label>
              <select className="border border-[#ddd5c5] px-3 py-2 text-sm bg-white" value={propFilter} onChange={(e) => setPropFilter(e.target.value)}>
                <option value="All">All Properties</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Agent</label>
              <select className="border border-[#ddd5c5] px-3 py-2 text-sm bg-white" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
                {agents.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">From</label>
              <input type="date" className="border border-[#ddd5c5] px-3 py-2 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}/>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">To</label>
              <input type="date" className="border border-[#ddd5c5] px-3 py-2 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)}/>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center gap-3 bg-amber/10 border border-amber/30 px-4 py-3">
              <span className="text-sm text-navy font-medium">{selected.length} selected</span>
              <button onClick={sendEmails} className="ml-auto bg-amber text-white text-xs font-semibold px-4 py-2 hover:bg-amber-hover transition-colors">
                Send Follow-Up Emails
              </button>
              <button onClick={() => setSelected([])} className="text-stone text-xs hover:text-navy transition-colors">Clear</button>
            </div>
          )}

          {/* Interest list */}
          <div className="bg-white shadow-sm divide-y divide-[#EDE5D5]">
            {filtered.length === 0 && <div className="py-12 text-center text-stone text-sm">No interests match your filters</div>}
            {filtered.map((i) => {
              const prop = properties.find((p) => p.id === i.propertyId);
              const isSelected = selected.includes(i.id);
              return (
                <div
                  key={i.id}
                  className={`p-5 flex items-start gap-4 cursor-pointer transition-colors ${isSelected ? "bg-amber/8" : "hover:bg-cream/30"}`}
                  onClick={() => toggleSelect(i.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(i.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 accent-amber"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-navy text-sm">{i.name}</div>
                        <div className="text-xs text-stone">{i.email}{i.phone ? " · " + i.phone : ""}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 ${i.emailSent ? "bg-sage/15 text-sage" : "bg-amber/15 text-amber-hover"}`}>
                          {i.emailSent ? "Contacted" : "Pending"}
                        </span>
                        <div className="text-[11px] text-stone mt-1">{i.date}</div>
                      </div>
                    </div>
                    <div className="text-xs text-stone mt-1.5">
                      <span className="font-medium text-navy">{prop?.name}</span> · Agent: {i.agent}
                    </div>
                    <div className="text-xs text-stone/80 mt-1 italic">"{i.message}"</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email template */}
        <div className="space-y-4">
          <div className="bg-white shadow-sm p-5">
            <h3 className="font-display text-navy font-semibold text-base mb-3">Follow-Up Email Template</h3>
            <p className="text-[11px] text-stone mb-3">Use {'{{name}}'}, {'{{property}}'}, {'{{agent}}'} as placeholders</p>
            <textarea
              className="w-full border border-[#ddd5c5] px-3 py-2.5 text-xs text-navy h-52 resize-none font-mono"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
            />
            <button className="w-full mt-3 border border-navy text-navy py-2 text-xs font-semibold hover:bg-navy hover:text-white transition-all">
              Save Template
            </button>
          </div>

          <div className="bg-white shadow-sm p-5">
            <h3 className="font-semibold text-navy text-sm mb-3">Summary</h3>
            <div className="space-y-2">
              {[
                { label: "Total Interests", value: interests.length },
                { label: "Pending Contact", value: interests.filter((i) => !i.emailSent).length },
                { label: "Contacted", value: interests.filter((i) => i.emailSent).length },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-stone">{label}</span>
                  <span className="font-semibold text-navy">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
