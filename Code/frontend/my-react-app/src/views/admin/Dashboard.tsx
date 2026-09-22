import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CampaignDashboard, CampaignDashboardDay, CampaignDashboardSummary } from "../../api/schemaTypes";
import { AdminPage, Feedback } from "../../components/AdminUI";
import { useQuery } from "../../api/useQuery";
import { formatCampaignDashboardDate, formatCampaignDashboardDay, formatCampaignSentDate, formatRate, sortCampaignPerformance, type CampaignSortKey } from "./campaignDashboard";

type DashboardTooltipProps = { active?: boolean; payload?: Array<{ payload: CampaignDashboardDay }> };

function CampaignDailyTooltip({ active, payload }: DashboardTooltipProps) {
  const day = payload?.[0]?.payload;
  if (!active || !day) return null;
  return <div className="border border-[#ddd5c5] bg-white px-3 py-2 text-xs text-navy shadow-sm"><p className="mb-1 font-semibold">{formatCampaignDashboardDate(day.date)}</p><p>Sent: {day.sent}</p><p>Clicks: {day.clicks}</p><p>Saves: {day.saves}</p><p>Interests: {day.interests}</p><p>Failed: {day.failed}</p><p>Unsubscribes: {day.unsubscribes}</p></div>;
}

function thirtyDaysAgo() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
}

function KpiCards({ summary }: { summary: CampaignDashboardSummary }) {
  const cards: Array<[string, number | string, string]> = [
    ["Emails sent", summary.sent, "Successfully sent campaign recipients"],
    ["Failed", summary.failed, "Recipient delivery failures"],
    ["Clicks", summary.clicks, "Campaign-attributed clicks"],
    ["Saves", summary.saves, "Campaign-attributed property saves"],
    ["Interests", summary.interests, "Campaign-attributed enquiries"],
    ["Unsubscribes", summary.unsubscribes, "Campaign unsubscribe events"],
    ["Click-through rate", formatRate(summary.ctr), "Clicks divided by sent"],
    ["Interest rate", formatRate(summary.interestRate), "Interests divided by sent"],
  ];
  return <section aria-label="Campaign performance summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value, detail]) => <article key={label} className="border border-[#ddd5c5] border-t-4 border-t-amber bg-white p-4"><p className="text-xs uppercase text-stone">{label}</p><p className="mt-2 font-display text-3xl font-bold text-navy">{value}</p><p className="mt-2 text-xs text-stone">{detail}</p></article>)}</section>;
}

function ConversionFunnel({ summary }: { summary: CampaignDashboardSummary }) {
  const rows = [
    ["Sent", summary.sent, 100],
    ["Clicked", summary.clicks, summary.sent ? (summary.clicks / summary.sent) * 100 : 0],
    ["Saved", summary.saves, summary.sent ? (summary.saves / summary.sent) * 100 : 0],
    ["Interested", summary.interests, summary.sent ? (summary.interests / summary.sent) * 100 : 0],
  ] as const;
  return <section className="bg-white p-4 sm:p-6"><div className="mb-5"><h2 className="font-semibold">Conversion funnel</h2><p className="mt-1 text-sm text-stone">Campaign-attributed actions as a share of successful sends.</p></div><div className="space-y-3">{rows.map(([label, value, rate], index) => <div key={label} className="mx-auto" style={{ width: `${Math.max(42, 100 - index * 14)}%` }}><div className="flex items-center justify-between gap-3 bg-navy px-3 py-3 text-sm text-white"><span className="font-semibold">{label}</span><span>{value} <span className="text-white/70">{index ? `(${rate.toFixed(1)}%)` : ""}</span></span></div></div>)}</div></section>;
}

function CampaignTable({ dashboard }: { dashboard: CampaignDashboard }) {
  const [sortKey, setSortKey] = useState<CampaignSortKey>("sentAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const rows = sortCampaignPerformance(dashboard.campaigns, sortKey, direction);
  const headers: Array<[string, CampaignSortKey | null]> = [["Campaign name", null], ["Sent date", "sentAt"], ["Recipients", null], ["Sent", null], ["Failed", null], ["Clicks", "clicks"], ["Saves", "saves"], ["Interests", "interests"], ["Unsubscribes", null], ["CTR", "ctr"], ["Interest rate", "interestRate"]];
  const chooseSort = (key: CampaignSortKey) => {
    if (key === sortKey) setDirection((current) => current === "desc" ? "asc" : "desc");
    else { setSortKey(key); setDirection("desc"); }
  };
  return <section className="bg-white p-4 sm:p-6"><div className="mb-4"><h2 className="font-semibold">Campaign performance</h2><p className="mt-1 text-sm text-stone">Newest sent campaigns first. Sort delivery and conversion metrics to compare results.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b border-[#ddd5c5]">{headers.map(([label, key]) => <th className="p-3 font-semibold" key={label}>{key ? <button type="button" className="text-left underline decoration-transparent underline-offset-4 hover:decoration-current" onClick={() => chooseSort(key)}>{label}{sortKey === key ? direction === "desc" ? " v" : " ^" : ""}</button> : label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.campaignId} className="border-b border-[#eee8dc]"><td className="p-3 font-medium">{row.campaignName}</td><td className="p-3">{formatCampaignSentDate(row.sentAt)}</td><td className="p-3">{row.recipients}</td><td className="p-3">{row.sent}</td><td className="p-3">{row.failed}</td><td className="p-3">{row.clicks}</td><td className="p-3">{row.saves}</td><td className="p-3">{row.interests}</td><td className="p-3">{row.unsubscribes}</td><td className="p-3">{formatRate(row.ctr)}</td><td className="p-3">{formatRate(row.interestRate)}</td></tr>)}</tbody></table></div>{!rows.length && <p className="py-8 text-center text-sm text-stone">No campaign delivery or attributed activity in this period.</p>}</section>;
}

export default function AdminDashboard() {
  const from = thirtyDaysAgo();
  const { data, loading, error } = useQuery<{ campaignDashboard: CampaignDashboard }>(`query CampaignDashboard($from:String!){campaignDashboard(from:$from){summary{sent failed clicks saves interests unsubscribes ctr interestRate} days{date sent failed clicks saves interests unsubscribes} campaigns{campaignId campaignName sentAt recipients sent failed clicks saves interests unsubscribes ctr interestRate}}}`, { from });
  const dashboard = data?.campaignDashboard;
  return <AdminPage title="Campaign Performance" description="Last 30 days of successful delivery and campaign-attributed engagement."><Feedback error={error} loading={loading}/>{dashboard && <div className="space-y-6"><KpiCards summary={dashboard.summary}/><section className="bg-white p-4 sm:p-6"><div className="mb-4"><h2 className="font-semibold">Daily performance</h2><p className="mt-1 text-sm text-stone">Daily UTC totals across all campaigns.</p></div>{dashboard.days.length ? <div className="h-72 sm:h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.days} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}><CartesianGrid stroke="#ddd5c5" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={formatCampaignDashboardDay} minTickGap={28} tick={{ fontSize: 12 }}/><YAxis allowDecimals={false} width={32} tick={{ fontSize: 12 }}/><Tooltip content={<CampaignDailyTooltip/>}/><Legend wrapperStyle={{ fontSize: 12 }}/><Bar dataKey="sent" name="Sent" fill="#1B2A4A"/><Bar dataKey="clicks" name="Clicks" fill="#E8761B"/><Bar dataKey="saves" name="Saves" fill="#4A6741"/><Bar dataKey="interests" name="Interests" fill="#6B2B4C"/></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-stone">No campaign activity in this period.</p>}</section><ConversionFunnel summary={dashboard.summary}/><CampaignTable dashboard={dashboard}/></div>}</AdminPage>;
}
