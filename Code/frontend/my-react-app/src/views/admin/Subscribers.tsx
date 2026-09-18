import { useState } from "react";
import { Link } from "react-router-dom";
import { graphqlRequest } from "../../api/graphql";
import { useQuery, useAction } from "../../api/useQuery";
import type { FileDownload, SubscriberConnection, SubscriberStats } from "../../api/schemaTypes";
import { AdminPage, Button, Field, Feedback, Pager, inputClass } from "../../components/AdminUI";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AdminSubscribers() {
  const [status, setStatus] = useState("ALL");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", consent: false });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const action = useAction();
  const query = useQuery<{ subscribersPage: SubscriberConnection }>(`query($input:SubscriberFilter){subscribersPage(input:$input){totalCount activeCount unsubscribedCount nodes{id name email phone status subscribedAt unsubscribedAt consentGrantedAt}}}`, { input: { status: status === "ALL" ? undefined : status, search, offset } });
  const stats = useQuery<{ subscriberStats: SubscriberStats }>(`query($from:String,$to:String){subscriberStats(from:$from,to:$to){totalSubscribers totalUnsubscribers averageSubscribersPerDay averageUnsubscribersPerDay days{date registrations activeRegistrations unsubscribes}}}`, { from: from || undefined, to: to || undefined });
  const nodes = query.data?.subscribersPage.nodes ?? [];
  const allVisibleSelected = Boolean(nodes.length) && nodes.every((subscriber) => selected.includes(subscriber.id));

  const exportFile = () => action.run(async () => {
    const { exportSubscribers: file } = await graphqlRequest<{ exportSubscribers: FileDownload }>(`query($status:SubscriberStatus){exportSubscribers(status:$status){filename mimeType contentBase64}}`, { status: status === "ALL" ? undefined : status });
    const bytes = Uint8Array.from(atob(file.contentBase64), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "Export downloaded");

  const deleteSelected = () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} selected subscriber${selected.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    void action.run(async () => {
      await graphqlRequest("mutation($ids:[ID!]!){deleteSubscribers(ids:$ids)}", { ids: selected });
      setSelected([]);
      query.reload();
    }, "Subscribers deleted");
  };

  return <AdminPage title="Subscribers" description={`${query.data?.subscribersPage.activeCount ?? 0} active · ${query.data?.subscribersPage.unsubscribedCount ?? 0} unsubscribed`}>
    <Feedback loading={query.loading} error={query.error || action.error} success={action.success} />
    <div className="flex gap-3 flex-wrap">
      <Button onClick={() => { setStatus("ACTIVE"); setOffset(0); setSelected([]); }}>Active</Button>
      <Button onClick={() => { setStatus("UNSUBSCRIBED"); setOffset(0); setSelected([]); }}>Unsubscribed</Button>
      <Button onClick={() => setAdding(!adding)}>Add Subscriber</Button>
      <Button disabled={action.busy || !selected.length} onClick={deleteSelected}>Delete Selected ({selected.length})</Button>
      <Link className="border border-navy px-4 py-2 text-sm" to="/admin/subscribers/import">Import CSV / Excel</Link>
      <Button disabled={action.busy} onClick={() => void exportFile()}>Export {status.toLowerCase()} to Excel</Button>
    </div>
    <section className="bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From"><input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
        <Field label="To"><input className={inputClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
        <div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase">Total subscribers</div><div className="text-2xl font-semibold">{stats.data?.subscriberStats.totalSubscribers ?? 0}</div></div>
        <div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase">Total unsubscribers</div><div className="text-2xl font-semibold">{stats.data?.subscriberStats.totalUnsubscribers ?? 0}</div></div>
        <div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase">Average subscribers/day</div><div className="text-2xl font-semibold">{stats.data?.subscriberStats.averageSubscribersPerDay.toFixed(2) ?? "0.00"}</div></div>
        <div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase">Average unsubscribes/day</div><div className="text-2xl font-semibold">{stats.data?.subscriberStats.averageUnsubscribersPerDay.toFixed(2) ?? "0.00"}</div></div>
      </div>
      {stats.data?.subscriberStats.days.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.data.subscriberStats.days}><CartesianGrid strokeDasharray="3 3" stroke="#ddd5c5" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="activeRegistrations" name="Active registrations" stroke="#4A6741" strokeWidth={3} /><Line type="monotone" dataKey="unsubscribes" name="Unsubscribes" stroke="#6B2B4C" strokeWidth={3} /></LineChart></ResponsiveContainer></div> : <p className="text-sm text-stone">No subscriber activity in this range.</p>}
    </section>
    {adding && <form className="bg-white p-6 space-y-4 max-w-xl" onSubmit={(event) => { event.preventDefault(); void action.run(async () => { await graphqlRequest("mutation($input:SubscriberInput!){addSubscriber(input:$input){id}}", { input: form }); setForm({ name: "", email: "", phone: "", consent: false }); setAdding(false); query.reload(); }, "Subscriber added"); }}>
      {([['name', 'Name'], ['email', 'Email'], ['phone', 'Phone (optional)']] as const).map(([key, label]) => <Field key={key} label={label}><input className={inputClass} type={key === "email" ? "email" : "text"} required={key !== "phone"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></Field>)}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" required checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />I have this person&apos;s explicit marketing consent.</label>
      <Button type="submit" disabled={action.busy}>Add Subscriber</Button>
    </form>}
    <input aria-label="Search subscribers" className={inputClass} value={search} placeholder="Search name or email" onChange={(event) => { setSearch(event.target.value); setOffset(0); setSelected([]); }} />
    <div className="bg-white overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-4 border-b"><input type="checkbox" aria-label="Select all visible subscribers" checked={allVisibleSelected} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...nodes.map((subscriber) => subscriber.id)])] : selected.filter((id) => !nodes.some((subscriber) => subscriber.id === id)))} /></th>{["Name", "Email", "Phone", "Status", "Date"].map((heading) => <th className="p-4 border-b" key={heading}>{heading}</th>)}</tr></thead><tbody>{nodes.map((subscriber) => <tr key={subscriber.id} className="border-b"><td className="p-4"><input type="checkbox" aria-label={`Select ${subscriber.email}`} checked={selected.includes(subscriber.id)} onChange={() => setSelected((ids) => ids.includes(subscriber.id) ? ids.filter((id) => id !== subscriber.id) : [...ids, subscriber.id])} /></td><td>{subscriber.name}</td><td>{subscriber.email}</td><td>{subscriber.phone || "—"}</td><td>{subscriber.status}</td><td>{(subscriber.status === "UNSUBSCRIBED" ? subscriber.unsubscribedAt : subscriber.subscribedAt)?.slice(0, 10) || "—"}</td></tr>)}</tbody></table>{!query.loading && !nodes.length && <p className="p-8">No subscribers match these filters.</p>}</div>
    <Pager offset={offset} total={query.data?.subscribersPage.totalCount ?? 0} onChange={(nextOffset) => { setOffset(nextOffset); setSelected([]); }} />
  </AdminPage>;
}
