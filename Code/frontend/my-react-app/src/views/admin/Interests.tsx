import { useState } from "react";
import { graphqlRequest } from "../../api/graphql";
import { useAction, useQuery } from "../../api/useQuery";
import type { Interest, InterestConnection, InterestFollowUp, InterestGroup, InterestStats, User } from "../../api/schemaTypes";
import { AdminPage, Button, Field, Feedback, Pager, inputClass } from "../../components/AdminUI";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Filter = { propertyName: string; from: string; to: string; location: string; agentId: string; pendingOnly: boolean };

export default function AdminInterests() {
  const [filter, setFilter] = useState<Filter>({ propertyName: "", from: "", to: "", location: "", agentId: "", pendingOnly: false });
  const [offset, setOffset] = useState(0);
  const [groupOffset, setGroupOffset] = useState(0);
  const [contact, setContact] = useState<Interest | null>(null);
  const input = { ...filter, propertyName: filter.propertyName || undefined, agentId: filter.agentId || undefined, from: filter.from || undefined, to: filter.to || undefined };
  const query = useQuery<{ interestsPage: InterestConnection; interestGroups: InterestGroup[]; agents: User[] }>(
    `query($input:InterestFilter,$groups:InterestFilter){interestsPage(input:$input){totalCount pendingCount nodes{id propertyId name email phone message dataConsent followUpSent createdAt property{id name location status} agent{id name} followUps{id interestId subject body status sendRequestedAt sentAt failedAt errorMessage createdAt}}} interestGroups(input:$groups){property{id name location status} totalCount pendingCount} agents{id name email role createdAt}}`,
    { input: { ...input, offset }, groups: { ...input, offset: groupOffset } },
    5000,
  );
  const stats = useQuery<{ interestStats: InterestStats }>(
    `query($input:InterestFilter){interestStats(input:$input){total averagePerDay totalFollowUps averageFollowUpsPerDay days{date interests followUps}}}`,
    { input },
  );
  const change = (key: keyof Filter, value: string | boolean) => { setFilter({ ...filter, [key]: value }); setOffset(0); setGroupOffset(0); };
  const clear = () => { setFilter({ propertyName: "", from: "", to: "", location: "", agentId: "", pendingOnly: false }); setOffset(0); setGroupOffset(0); };

  return <AdminPage title="Interests Management" description={`${query.data?.interestsPage.pendingCount ?? 0} awaiting follow-up in this view. History is preserved after contact.`}>
    <Feedback error={query.error} loading={query.loading} />
    <section className="bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="font-semibold">Daily interest activity</h2><p className="text-sm text-stone">Totals use the selected range, or all records when no dates are selected.</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase tracking-wider">Total interests</div><div className="text-2xl font-semibold text-navy">{stats.data?.interestStats.total ?? 0}</div></div><div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase tracking-wider">Total follow-ups</div><div className="text-2xl font-semibold text-navy">{stats.data?.interestStats.totalFollowUps ?? 0}</div></div><div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase tracking-wider">Average interests/day</div><div className="text-2xl font-semibold text-navy">{stats.data?.interestStats.averagePerDay.toFixed(2) ?? "0.00"}</div></div><div className="bg-cream-dark px-4 py-3"><div className="text-xs text-stone uppercase tracking-wider">Average follow-ups/day</div><div className="text-2xl font-semibold text-navy">{stats.data?.interestStats.averageFollowUpsPerDay.toFixed(2) ?? "0.00"}</div></div></div>
      </div>
      {stats.data?.interestStats.days.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.data.interestStats.days} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#ddd5c5" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="interests" name="Interests" stroke="#E8761B" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="followUps" name="Follow-ups" stroke="#1B2A4A" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <p className="text-sm text-stone">No daily activity in this range.</p>}
    </section>
    <div className="bg-white p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Field label="Property name"><input className={inputClass} placeholder="e.g. Oakfield Manor" value={filter.propertyName} onChange={(event) => change("propertyName", event.target.value)} /></Field>
      <Field label="Location"><input className={inputClass} value={filter.location} onChange={(event) => change("location", event.target.value)} /></Field>
      <Field label="From"><input className={inputClass} type="date" value={filter.from} onChange={(event) => change("from", event.target.value)} /></Field>
      <Field label="To"><input className={inputClass} type="date" value={filter.to} onChange={(event) => change("to", event.target.value)} /></Field>
      <Field label="Assigned agent"><select className={inputClass} value={filter.agentId} onChange={(event) => change("agentId", event.target.value)}><option value="">All agents</option>{query.data?.agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filter.pendingOnly} onChange={(event) => change("pendingOnly", event.target.checked)} />Awaiting follow-up only</label>
      <Button onClick={clear}>Clear filters</Button>
    </div>
    <section className="space-y-3"><h2 className="font-semibold">Interests by property</h2><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{query.data?.interestGroups.map((group) => <button key={group.property.id} className="bg-white p-4 text-left border-l-4 border-amber" onClick={() => change("propertyName", group.property.name)}><h3 className="font-semibold">{group.property.name}</h3><p className="text-xs text-stone">{group.property.location} · {group.property.status}</p><p className="text-xl mt-2">{group.totalCount} total</p><p className="text-sm">{group.pendingCount} pending</p></button>)}</div><div className="flex gap-3"><Button disabled={!groupOffset} onClick={() => setGroupOffset(Math.max(0, groupOffset - 20))}>Previous properties</Button><Button disabled={(query.data?.interestGroups.length ?? 0) < 20} onClick={() => setGroupOffset(groupOffset + 20)}>More properties</Button></div></section>
    <div className="space-y-3">{query.data?.interestsPage.nodes.map((interest) => <article key={interest.id} className="bg-white p-5 space-y-2"><div className="flex justify-between gap-3"><h2 className="font-semibold">{interest.name} · {interest.property.name}</h2><span className="text-sm">{interest.followUpSent ? "Contacted" : "Awaiting follow-up"}</span></div><p className="text-sm">{interest.email} · {interest.phone || "No phone"}</p><p className="text-xs text-stone">{new Date(interest.createdAt).toLocaleString()} · {interest.property.location} · {interest.agent?.name || "Unassigned"}</p><p className="whitespace-pre-wrap text-sm">{interest.message}</p>{interest.followUps.map((followUp) => <p key={followUp.id} className="text-xs">{followUp.subject}: {followUp.sendRequestedAt ? followUp.status : "DRAFT"} {followUp.errorMessage && `— ${followUp.errorMessage}`}</p>)}<Button disabled={!interest.dataConsent} onClick={() => setContact(interest)}>Compose email</Button></article>)}</div>
    {!query.loading && !query.data?.interestsPage.nodes.length && <p>No interests match these filters.</p>}
    <Pager offset={offset} total={query.data?.interestsPage.totalCount ?? 0} onChange={setOffset} />
    {contact && <Contact key={contact.id} interest={contact} close={() => { setContact(null); query.reload(); }} />}
  </AdminPage>;
}

function Contact({ interest, close }: { interest: Interest; close: () => void }) {
  const draft = interest.followUps.find((followUp) => !followUp.sendRequestedAt);
  const [id, setId] = useState(draft?.id);
  const [subject, setSubject] = useState(draft?.subject ?? `Your interest in ${interest.property.name}`);
  const [body, setBody] = useState(draft?.body ?? "Dear {{name}},\n\nThank you for your interest in {{property}}. Please let us know a convenient time to speak.\n\nBest regards,\n{{agent}}");
  const action = useAction();
  const save = (send: boolean) => action.run(async () => { const result = await graphqlRequest<{ saveFollowUp: InterestFollowUp }>("mutation($id:ID,$input:FollowUpInput!){saveFollowUp(id:$id,input:$input){id}}", { id, input: { interestId: interest.id, subject, body } }); setId(result.saveFollowUp.id); if (send) await graphqlRequest("mutation($id:ID!){sendFollowUp(id:$id){id status}}", { id: result.saveFollowUp.id }); close(); }, send ? "Email queued" : "Email draft saved");
  return <section role="dialog" aria-label="Contact interested user" className="bg-white border border-amber p-6 space-y-4"><h2 className="text-xl font-semibold">Email {interest.name}</h2><p className="text-sm">To: {interest.email}</p><Feedback error={action.error} /><Field label="Subject"><input className={inputClass} value={subject} onChange={(event) => setSubject(event.target.value)} /></Field><Field label="Email content"><textarea className={inputClass} rows={9} value={body} onChange={(event) => setBody(event.target.value)} /></Field><div className="flex gap-3"><Button disabled={action.busy} onClick={() => void save(false)}>Save Draft</Button><Button disabled={action.busy || !subject.trim() || !body.trim()} onClick={() => void save(true)}>Send Email</Button><Button disabled={action.busy} onClick={close}>Cancel</Button></div></section>;
}
