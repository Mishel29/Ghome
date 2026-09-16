import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useApp } from "../../context";
import { fmt } from "../../data";
import type { Campaign } from "../../data";

export default function AdminCampaigns() {
  const { campaigns, setCampaigns, properties, subscribers } = useApp();
  const [tab, setTab] = useState<"log" | "create" | "stats">("log");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Create campaign state
  const [subject, setSubject] = useState("");
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [template, setTemplate] = useState(`<html><body>
<h1 style="color:#1B2A4A">Harborstone Homes</h1>
<p>Discover our latest developments...</p>
{{properties}}
<p>Best wishes,<br/>The Harborstone Team</p>
</body></html>`);
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Filters for campaign log
  const [filterStatus, setFilterStatus] = useState("All");

  const activeSubs = subscribers.filter((s) => !s.unsubscribed);

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterStatus !== "All" && c.status !== filterStatus) return false;
    if (dateFrom && c.sentDate && c.sentDate < dateFrom) return false;
    if (dateTo && c.sentDate && c.sentDate > dateTo) return false;
    return true;
  });

  const toggleProp = (id: string) =>
    setSelectedProps((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const sendCampaign = async () => {
    if (!subject.trim() || selectedProps.length === 0) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 2000));
    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      subject,
      status: "sent",
      sentDate: new Date().toISOString().split("T")[0],
      properties: selectedProps,
      clickCount: 0,
      interestCount: 0,
      saveCount: 0,
      emailsSent: activeSubs.length,
      emailsFailed: 0,
      dailyStats: [{ date: "Today", sent: activeSubs.length, clicks: 0, interests: 0, unsubscribes: 0 }],
    };
    setCampaigns([...campaigns, newCampaign]);
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setTab("log"); setSubject(""); setSelectedProps([]); }, 2000);
  };

  // Stats data (aggregate per day)
  const statsData = campaigns
    .filter((c) => c.status === "sent")
    .flatMap((c) => c.dailyStats)
    .reduce((acc: Record<string, { sent: number; clicks: number; interests: number; unsubscribes: number }>, d) => {
      if (!acc[d.date]) acc[d.date] = { sent: 0, clicks: 0, interests: 0, unsubscribes: 0 };
      acc[d.date].sent += d.sent;
      acc[d.date].clicks += d.clicks;
      acc[d.date].interests += d.interests;
      acc[d.date].unsubscribes += d.unsubscribes;
      return acc;
    }, {});
  const chartData = Object.entries(statsData).map(([date, v]) => ({ date, ...v }));

  const totalEmailsSent = campaigns.reduce((s, c) => s + c.emailsSent, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clickCount, 0);
  const totalInterests = campaigns.reduce((s, c) => s + c.interestCount, 0);
  const clickRate = totalEmailsSent > 0 ? ((totalClicks / totalEmailsSent) * 100).toFixed(1) : "0";
  const interestRate = totalEmailsSent > 0 ? ((totalInterests / totalEmailsSent) * 100).toFixed(1) : "0";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-navy text-3xl font-bold">Email Campaigns</h1>
          <p className="text-stone text-sm mt-1">{campaigns.filter((c) => c.status === "sent").length} campaigns sent · {activeSubs.length} active subscribers</p>
        </div>
        <button
          onClick={() => setTab("create")}
          className="bg-amber text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-hover transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Create Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#ddd5c5]">
        {(["log", "create", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-all ${tab === t ? "border-amber text-amber" : "border-transparent text-stone hover:text-navy"}`}
          >
            {t === "log" ? "Campaign Log" : t === "create" ? "Create Campaign" : "Statistics"}
          </button>
        ))}
      </div>

      {/* Campaign Log */}
      {tab === "log" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 bg-white p-4 shadow-sm">
            <div>
              <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Status</label>
              <select className="border border-[#ddd5c5] px-3 py-2 text-sm bg-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                {["All", "sent", "draft", "failed"].map((s) => <option key={s}>{s}</option>)}
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

          <div className="bg-white shadow-sm divide-y divide-[#EDE5D5]">
            {filteredCampaigns.length === 0 && <div className="py-12 text-center text-stone text-sm">No campaigns found</div>}
            {filteredCampaigns.map((c) => {
              const props = properties.filter((p) => c.properties.includes(p.id));
              const clickRate = c.emailsSent > 0 ? ((c.clickCount / c.emailsSent) * 100).toFixed(1) : "—";
              return (
                <div key={c.id}>
                  <div
                    className="p-5 cursor-pointer hover:bg-cream/40 transition-colors"
                    onClick={() => setSelectedCampaign(selectedCampaign?.id === c.id ? null : c)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 ${c.status === "sent" ? "bg-sage/15 text-sage" : c.status === "draft" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                            {c.status}
                          </span>
                          {c.sentDate && <span className="text-xs text-stone">{c.sentDate}</span>}
                        </div>
                        <div className="font-semibold text-navy text-sm">{c.subject}</div>
                        <div className="text-xs text-stone mt-0.5">{props.map((p) => p.name).join(", ")}</div>
                      </div>
                      <div className="flex gap-6 text-center shrink-0 hidden md:flex">
                        {[
                          { label: "Sent", value: c.emailsSent },
                          { label: "Clicks", value: c.clickCount },
                          { label: "Interests", value: c.interestCount },
                          { label: "Click Rate", value: clickRate + "%" },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div className="font-bold text-navy text-sm">{value}</div>
                            <div className="text-[10px] text-stone">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded */}
                  {selectedCampaign?.id === c.id && c.dailyStats.length > 0 && (
                    <div className="px-5 pb-5 bg-cream/30">
                      <h3 className="font-semibold text-navy text-xs uppercase tracking-wider mb-3">Per-Day Performance</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#ddd5c5]">
                              {["Date", "Sent", "Clicks", "Interests", "Unsubscribes", "Click Rate"].map((h) => (
                                <th key={h} className="text-left py-2 pr-6 text-stone font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {c.dailyStats.map((d, i) => (
                              <tr key={i} className="border-b border-[#EDE5D5] last:border-0">
                                <td className="py-2 pr-6 text-navy font-medium">{d.date}</td>
                                <td className="py-2 pr-6">{d.sent}</td>
                                <td className="py-2 pr-6">{d.clicks}</td>
                                <td className="py-2 pr-6">{d.interests}</td>
                                <td className="py-2 pr-6">{d.unsubscribes}</td>
                                <td className="py-2 pr-6">{d.sent > 0 ? ((d.clicks / d.sent) * 100).toFixed(0) + "%" : d.clicks + " clicks"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Campaign */}
      {tab === "create" && (
        <div className="bg-white shadow-sm p-7 space-y-6 max-w-3xl">
          {sent && (
            <div className="bg-sage/20 border border-sage text-sage px-4 py-3 text-sm font-semibold flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              Campaign sent to {activeSubs.length} subscribers!
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-2">Subject Line</label>
            <input
              className="w-full border border-[#ddd5c5] px-4 py-2.5 text-sm text-navy"
              placeholder="e.g. New Homes Available at The Meridian"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Property selection */}
          <div>
            <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-3">Select Properties</label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {properties.map((p) => {
                const isOn = selectedProps.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProp(p.id)}
                    className={`flex items-center gap-2 p-3 border text-left text-xs transition-all ${isOn ? "border-amber bg-amber/10 text-navy" : "border-[#ddd5c5] text-stone hover:border-navy hover:text-navy"}`}
                  >
                    <span className={`w-4 h-4 border flex items-center justify-center shrink-0 ${isOn ? "border-amber bg-amber" : "border-stone"}`}>
                      {isOn && <svg width="10" height="10" fill="white" viewBox="0 0 12 12"><path d="M10 3L5 9 2 6" stroke="white" strokeWidth="1.5" fill="none"/></svg>}
                    </span>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[10px] text-stone">{p.clickCount} clicks · {p.interestCount} interests</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone uppercase tracking-wider">Email Template</label>
              <div className="flex gap-1">
                <button onClick={() => setEditorMode("visual")} className={`text-xs px-3 py-1 border ${editorMode === "visual" ? "bg-navy text-white border-navy" : "border-[#ddd5c5] text-stone"}`}>Visual</button>
                <button onClick={() => setEditorMode("code")} className={`text-xs px-3 py-1 border ${editorMode === "code" ? "bg-navy text-white border-navy" : "border-[#ddd5c5] text-stone"}`}>Code</button>
              </div>
            </div>
            {editorMode === "code" ? (
              <textarea className="w-full border border-[#ddd5c5] px-3 py-2.5 text-xs font-mono text-navy h-48 resize-none bg-cream" value={template} onChange={(e) => setTemplate(e.target.value)}/>
            ) : (
              <div className="border border-[#ddd5c5] p-4 bg-white min-h-36 text-sm text-navy">
                <div className="text-lg font-display font-bold text-navy mb-2">Harborstone Homes</div>
                <p className="text-stone mb-3">Discover our latest developments...</p>
                {selectedProps.length > 0 ? (
                  <div className="space-y-2">
                    {properties.filter((p) => selectedProps.includes(p.id)).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-cream-dark p-3">
                        <img src={p.image} alt={p.name} className="w-16 h-12 object-cover shrink-0"/>
                        <div>
                          <div className="font-semibold text-navy text-xs">{p.name}</div>
                          <div className="text-[11px] text-stone">{p.type} · from {fmt(p.price.min)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-stone text-xs italic">Select properties above to preview here</div>}
                <p className="text-stone text-xs mt-3">Best wishes,<br/>The Harborstone Team</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-[#EDE5D5]">
            <div className="text-xs text-stone">
              Sending to <strong className="text-navy">{activeSubs.length} subscribers</strong>
            </div>
            <button
              onClick={sendCampaign}
              disabled={!subject.trim() || selectedProps.length === 0 || sending}
              className="ml-auto bg-amber text-white px-6 py-2.5 text-sm font-semibold hover:bg-amber-hover transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {sending ? <>
                <svg className="animate-spin" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Sending...
              </> : "Send Campaign"}
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {tab === "stats" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Sent", value: totalEmailsSent },
              { label: "Total Clicks", value: totalClicks },
              { label: "Total Interests", value: totalInterests },
              { label: "Click/Email Rate", value: clickRate + "%" },
              { label: "Interest/Email Rate", value: interestRate + "%" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white p-5 shadow-sm text-center">
                <div className="font-display text-2xl font-bold text-navy">{value}</div>
                <div className="text-xs text-stone mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Date range filter */}
          <div className="flex gap-3 bg-white p-4 shadow-sm">
            <div>
              <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Date From</label>
              <input type="date" className="border border-[#ddd5c5] px-3 py-2 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}/>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone uppercase tracking-wider block mb-1">Date To</label>
              <input type="date" className="border border-[#ddd5c5] px-3 py-2 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)}/>
            </div>
          </div>

          <div className="bg-white p-6 shadow-sm">
            <h2 className="font-display text-navy font-semibold text-base mb-4">Daily Performance</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE5D5"/>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A8070" }}/>
                <YAxis tick={{ fontSize: 10, fill: "#8A8070" }}/>
                <Tooltip contentStyle={{ fontSize: 12 }}/>
                <Bar dataKey="clicks" fill="#1B2A4A" name="Clicks"/>
                <Bar dataKey="interests" fill="#E8761B" name="Interests"/>
                <Bar dataKey="unsubscribes" fill="#6B2B4C" name="Unsubscribes"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 shadow-sm">
            <h2 className="font-display text-navy font-semibold text-base mb-4">Emails Sent Per Day</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE5D5"/>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A8070" }}/>
                <YAxis tick={{ fontSize: 10, fill: "#8A8070" }}/>
                <Tooltip contentStyle={{ fontSize: 12 }}/>
                <Line type="monotone" dataKey="sent" stroke="#4A6741" strokeWidth={2} name="Emails Sent" dot={{ r: 4 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
