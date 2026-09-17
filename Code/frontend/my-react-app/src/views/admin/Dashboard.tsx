import { useApp } from "../../context";
import { useNavigate } from "react-router-dom";
import { fmt } from "../../data";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { properties, interests, subscribers, campaigns } = useApp();

  const activeSubs = subscribers.filter((s) => !s.unsubscribed).length;
  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length;
  const totalInterests = interests.length;
  const activeProps = properties.filter((p) => p.status === "on-sale").length;

  const reachData = campaigns
    .filter((c) => c.status === "sent")
    .flatMap((c) => c.dailyStats)
    .reduce((acc: Record<string, { clicks: number; interests: number }>, d) => {
      if (!acc[d.date]) acc[d.date] = { clicks: 0, interests: 0 };
      acc[d.date].clicks += d.clicks;
      acc[d.date].interests += d.interests;
      return acc;
    }, {});

  const chartData = Object.entries(reachData).map(([date, v]) => ({ date, ...v }));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-navy text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-stone text-sm mt-1">Welcome back — here's your platform overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Active Properties", value: activeProps, sub: `${properties.length} total`, color: "border-navy", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" },
          { label: "Total Interests", value: totalInterests, sub: "Awaiting follow-up", color: "border-amber", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
          { label: "Subscribers", value: activeSubs, sub: `${subscribers.filter((s) => s.unsubscribed).length} unsubscribed`, color: "border-sage", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
          { label: "Campaigns Sent", value: sentCampaigns, sub: `${campaigns.filter((c) => c.status === "draft").length} draft`, color: "border-burgundy", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} className={`bg-white border-l-4 ${color} p-5 shadow-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-stone uppercase tracking-wider mb-1">{label}</div>
                <div className="font-display text-3xl font-bold text-navy">{value}</div>
                <div className="text-xs text-stone mt-1">{sub}</div>
              </div>
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-stone opacity-40 mt-1">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reach chart */}
        <div className="lg:col-span-2 bg-white p-6 shadow-sm">
          <h2 className="font-display text-navy font-semibold text-base mb-4">Campaign Reach (All Time)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B2A4A" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1B2A4A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="interests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8761B" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#E8761B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE5D5"/>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A8070" }}/>
                <YAxis tick={{ fontSize: 10, fill: "#8A8070" }}/>
                <Tooltip contentStyle={{ fontSize: 12 }}/>
                <Area type="monotone" dataKey="clicks" stroke="#1B2A4A" fill="url(#clicks)" strokeWidth={2} name="Clicks"/>
                <Area type="monotone" dataKey="interests" stroke="#E8761B" fill="url(#interests)" strokeWidth={2} name="Interests"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-stone text-sm">No campaign data yet</div>
          )}
        </div>

        {/* Recent interests */}
        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-navy font-semibold text-base">Recent Interests</h2>
            <button onClick={() => navigate("/admin/interests")}className="text-xs text-amber hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {interests.slice(-5).reverse().map((i) => {
              const prop = properties.find((p) => p.id === i.propertyId);
              return (
                <div key={i.id} className="flex items-start gap-3 py-2 border-b border-[#EDE5D5] last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i.emailSent ? "bg-sage" : "bg-amber"}`}/>
                  <div>
                    <div className="font-medium text-navy text-xs">{i.name}</div>
                    <div className="text-[11px] text-stone">{prop?.name} · {i.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Property snapshot */}
      <div className="bg-white shadow-sm">
        <div className="p-5 border-b border-[#EDE5D5] flex items-center justify-between">
          <h2 className="font-display text-navy font-semibold text-base">Property Snapshot</h2>
          <button onClick={() => navigate("/admin/properties")} className="text-xs text-amber hover:underline">Manage</button>
        </div>
        <div className="divide-y divide-[#EDE5D5]">
          {properties.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-4">
                <img src={p.image} alt={p.name} className="w-10 h-10 object-cover shrink-0"/>
                <div>
                  <div className="font-medium text-navy text-sm">{p.name}</div>
                  <div className="text-[11px] text-stone">{p.location} · {p.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-stone">
                <span className="hidden md:block">{fmt(p.price.min)}–{fmt(p.price.max)}</span>
                <span className="hidden lg:block">{p.interestCount} interests</span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold ${
                  p.status === "on-sale" ? "bg-amber/15 text-amber-hover" :
                  p.status === "coming-soon" ? "bg-burgundy/15 text-burgundy" :
                  p.status === "sold-out" ? "bg-stone/20 text-stone" : "bg-[#eee] text-[#666]"
                }`}>
                  {p.status.replace("-", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
