import { useState } from "react";
import { useQuery } from "../api/useQuery";
import type { PropertyConnection,PropertyFilterInput } from "../api/schemaTypes";
import PropertyFilters from "./PropertyFilters";
import { Feedback,Pager,Button } from "./AdminUI";
import { fmt } from "../data";
export default function PropertySelector({selected,onChange,publishedOnly=false,metrics=false}:{selected:string[];onChange:(ids:string[])=>void;publishedOnly?:boolean;metrics?:boolean}){
 const [filter,setFilter]=useState<PropertyFilterInput>({});const [offset,setOffset]=useState(0);
 const {data,error,loading}=useQuery<{adminProperties:PropertyConnection}>(`query($filter:PropertyFilterInput,$offset:Int){adminProperties(filter:$filter,offset:$offset,limit:12){totalCount nodes{id name location status publicationStatus priceMin type bedroomsMin bathroomsMin clickCount interestCount media{id type url}}}}`,{filter:{...filter,...(publishedOnly?{publicationStatus:"PUBLISHED"}: {})},offset});
 return <section className="space-y-3"><PropertyFilters value={filter} metrics={metrics} onChange={(f)=>{setFilter(f);setOffset(0);}}/><Feedback error={error} loading={loading}/><p className="text-sm">{selected.length} selected · {data?.adminProperties.totalCount??0} matching properties <Button disabled={!selected.length} onClick={()=>onChange([])}>Clear selection</Button></p>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{data?.adminProperties.nodes.map((p)=><label key={p.id} className={`border p-4 cursor-pointer bg-white ${selected.includes(p.id)?"border-amber":"border-[#ddd5c5]"}`}><div className="flex gap-2 items-start"><input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.includes(p.id)} onChange={()=>onChange(selected.includes(p.id)?selected.filter((id)=>id!==p.id):[...selected,p.id])}/><div><strong>{p.name}</strong><p className="text-sm text-stone">{p.location} · {p.type}</p><p className="text-sm">{p.priceMin==null?"Price not set":fmt(p.priceMin)} · {p.bedroomsMin??"—"} beds · {p.bathroomsMin??"—"} baths</p><p className="text-xs text-stone">{p.publicationStatus} · {p.status}</p>{metrics&&<p className="text-xs">{p.clickCount} clicks · {p.interestCount} interests</p>}</div></div></label>)}</div>
 {!loading&&!data?.adminProperties.nodes.length&&<p className="text-stone">No matching properties.</p>}<Pager offset={offset} size={12} total={data?.adminProperties.totalCount??0} onChange={setOffset}/></section>;
}
