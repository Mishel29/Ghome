import { useState } from "react";
import { useApp } from "../../context";
import type { Subscriber } from "../../data";

export default function AdminSubscribers() {
  const { subscribers, setSubscribers } = useApp();
  const [tab, setTab] = useState<"active" | "unsubscribed" | "add">("active");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);

  const active = subscribers.filter((s) => !s.unsubscribed);
  const unsubbed = subscribers.filter((s) => s.unsubscribed);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name required";
    if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = "Valid email required";
    if (subscribers.some((s) => s.email === form.email)) e.email = "Email already subscribed";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const newSub: Subscriber = {
      id: `s${Date.now()}`,
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      subscribedDate: new Date().toISOString().split("T")[0],
      unsubscribed: false,
    };
    setSubscribers([...subscribers, newSub]);
    setForm({ name: "", email: "", phone: "" });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const exportCSV = (list: Subscriber[], filename: string) => {
    const headers = ["Name", "Email", "Phone", "Subscribed Date", "Status"];
    const rows = list.map((s) => [s.name, s.email, s.phone ?? "", s.subscribedDate, s.unsubscribed ? "Unsubscribed" : "Active"]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const SubTable = ({ list }: { list: Subscriber[] }) => (
    <div className="bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-cream-dark border-b border-[#ddd5c5]">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-semibold text-stone uppercase tracking-wider">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider hidden md:table-cell">Phone</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider hidden lg:table-cell">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDE5D5]">
          {list.map((s) => (
            <tr key={s.id} className="hover:bg-cream/30 transition-colors">
              <td className="px-5 py-3.5 font-medium text-navy">{s.name}</td>
              <td className="px-4 py-3.5 text-stone">{s.email}</td>
              <td className="px-4 py-3.5 text-stone hidden md:table-cell">{s.phone ?? "—"}</td>
              <td className="px-4 py-3.5 text-stone hidden lg:table-cell">{s.unsubscribed ? (s.unsubscribedDate ?? s.subscribedDate) : s.subscribedDate}</td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={4} className="py-12 text-center text-stone">No subscribers found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-navy text-3xl font-bold">Subscribers</h1>
          <p className="text-stone text-sm mt-1">{active.length} active · {unsubbed.length} unsubscribed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#ddd5c5]">
        {(["active", "unsubscribed", "add"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-all ${tab === t ? "border-amber text-amber" : "border-transparent text-stone hover:text-navy"}`}
          >
            {t === "active" ? `Active (${active.length})` : t === "unsubscribed" ? `Unsubscribed (${unsubbed.length})` : "Add Subscriber"}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => exportCSV(active, "active-subscribers.csv")} className="flex items-center gap-2 text-sm border border-navy text-navy px-4 py-2 hover:bg-navy hover:text-white transition-all">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export to Excel
            </button>
          </div>
          <SubTable list={active}/>
        </div>
      )}

      {tab === "unsubscribed" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => exportCSV(unsubbed, "unsubscribed.csv")} className="flex items-center gap-2 text-sm border border-navy text-navy px-4 py-2 hover:bg-navy hover:text-white transition-all">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export to Excel
            </button>
          </div>
          <SubTable list={unsubbed}/>
        </div>
      )}

      {tab === "add" && (
        <div className="bg-white shadow-sm p-7 max-w-lg space-y-5">
          <h2 className="font-display text-navy font-semibold text-lg">Add Subscriber</h2>
          {added && (
            <div className="bg-sage/20 border border-sage text-sage text-sm px-4 py-3 flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
              Subscriber added successfully!
            </div>
          )}
          <form onSubmit={addSubscriber} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Full Name *</label>
              <input className="w-full border border-[#ddd5c5] px-3 py-2.5 text-sm text-navy" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aoife Brennan"/>
              {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Email Address *</label>
              <input className="w-full border border-[#ddd5c5] px-3 py-2.5 text-sm text-navy" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="aoife@example.com"/>
              {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1.5">Phone (optional)</label>
              <input className="w-full border border-[#ddd5c5] px-3 py-2.5 text-sm text-navy" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="087-xxx-xxxx"/>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="bg-amber text-white px-6 py-2.5 text-sm font-semibold hover:bg-amber-hover transition-colors">Add Subscriber</button>
              <button type="button" onClick={() => setForm({ name: "", email: "", phone: "" })} className="border border-[#ddd5c5] text-stone px-4 py-2.5 text-sm hover:text-navy transition-colors">Clear</button>
            </div>
          </form>

          <div className="pt-4 border-t border-[#EDE5D5]">
            <div className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">Bulk Import via Excel</div>
            <div className="border-2 border-dashed border-[#ddd5c5] p-6 text-center text-stone text-sm">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-2 opacity-40">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Drop .xlsx or .csv here, or <span className="text-navy underline cursor-pointer">click to browse</span><br/>
              <span className="text-[11px]">Columns: Name, Email, Phone</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
