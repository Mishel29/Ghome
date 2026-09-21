import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "../../api/useQuery";
import type { AdminDashboard as DashboardData,CampaignActivityPoint } from "../../api/schemaTypes";
import { AdminPage,Feedback } from "../../components/AdminUI";
import { Legend,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis } from "recharts";
import { formatCampaignActivityAxisLabel,formatCampaignActivityDate,formatCampaignActivityTime,toCampaignActivityTimeline,type CampaignActivityTimelinePoint } from "./campaignActivityTimeline";

type CampaignActivityTooltipProps = { active?: boolean; payload?: Array<{ payload: CampaignActivityTimelinePoint }> };

function CampaignActivityTooltip({ active,payload }: CampaignActivityTooltipProps) {
  const point=payload?.[0]?.payload;
  if(!active||!point)return null;
  const metrics=[["Sent",point.sent],["Failed",point.failed],["Clicks",point.clicks],["Saves",point.saves],["Interests",point.interests],["Unsubscribes",point.unsubscribes]].filter(([,value])=>value);
  return <div className="border border-[#ddd5c5] bg-white px-3 py-2 text-xs text-navy shadow-sm"><p className="font-semibold">{point.campaignSubject}</p><p>Date: {formatCampaignActivityDate(point.timestampMs)}</p><p>Time: {formatCampaignActivityTime(point.timestampMs)}</p>{metrics.map(([label,value])=><p key={label}>{label}: {value}</p>)}</div>;
}

function thirtyDaysAgo(){const date=new Date();date.setUTCDate(date.getUTCDate()-29);return date.toISOString().slice(0,10);}

function useCompactChart(){const [compact,setCompact]=useState(false);useEffect(()=>{const media=window.matchMedia("(max-width: 639px)");const update=()=>setCompact(media.matches);update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);return compact;}

export default function AdminDashboard(){const from=thirtyDaysAgo();const {data,loading,error}=useQuery<{adminDashboard:DashboardData;campaignActivity:CampaignActivityPoint[]}>(`query DashboardCampaignActivity($from:String!){adminDashboard{properties publishedProperties subscribers unsubscribers campaigns sentCampaigns interests pendingInterests news users} campaignActivity(from:$from){campaignId campaignSubject timestamp sent failed clicks interests saves unsubscribes}}`,{from});
  const d=data?.adminDashboard;
  const timeline=toCampaignActivityTimeline(data?.campaignActivity??[]);
  const compact=useCompactChart();
  return <AdminPage title="Admin Dashboard" description="Current platform totals and campaign activity from the database."><Feedback error={error} loading={loading}/>{d&&<><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{[["Properties",d.properties,`${d.publishedProperties} published`,"properties"],["Subscribers",d.subscribers,`${d.unsubscribers} unsubscribed`,"subscribers"],["Campaigns",d.campaigns,`${d.sentCampaigns} sent`,"campaigns"],["Interests",d.interests,`${d.pendingInterests} awaiting follow-up`,"interests"],["News",d.news,"Articles and announcements","news"],["Users",d.users,"Platform accounts","users"]].map(([label,value,sub,path])=><Link to={`/admin/${path}`} className="bg-white border-l-4 border-amber p-5 shadow-sm" key={label}><p className="text-xs uppercase text-stone">{label}</p><p className="font-display text-3xl font-bold mt-2">{value}</p><p className="text-xs text-stone mt-2">{sub}</p></Link>)}</div><section className="bg-white p-3 sm:p-6"><h2 className="text-sm sm:text-base font-semibold mb-4">Campaign activity — last 30 days</h2>{timeline.length?<ResponsiveContainer width="100%" height={compact?220:300}><LineChart data={timeline} margin={{top:12,right:compact?0:12,left:compact?0:-12,bottom:compact?12:4}}><XAxis dataKey="timestampMs" type="number" scale="time" domain={["dataMin","dataMax"]} tickFormatter={(value)=>formatCampaignActivityAxisLabel(value)} minTickGap={compact?100:72} tick={{fontSize:12}}/><YAxis hide={compact} allowDecimals={false} width={32}/><Tooltip content={<CampaignActivityTooltip/>}/>{!compact&&<Legend wrapperStyle={{fontSize:12}}/>}<Line dataKey="sentValue" name="Sent" stroke="#1B2A4A" dot={{r:3}} activeDot={{r:5}} connectNulls={false}/><Line dataKey="failedValue" name="Failed" stroke="#B42318" dot={{r:3}} activeDot={{r:5}} connectNulls={false}/><Line dataKey="clicksValue" name="Clicks" stroke="#E8761B" dot={{r:3}} activeDot={{r:5}} connectNulls={false}/><Line dataKey="savesValue" name="Saves" stroke="#4A6741" dot={{r:3}} activeDot={{r:5}} connectNulls={false}/><Line dataKey="interestsValue" name="Interests" stroke="#805AD5" dot={{r:3}} activeDot={{r:5}} connectNulls={false}/><Line dataKey="unsubscribesValue" name="Unsubscribes" stroke="#6B7280" dot={{r:3}} activeDot={{r:5}} connectNulls={false}/></LineChart></ResponsiveContainer>:<p className="text-stone py-12 text-center">No campaign activity in this period.</p>}</section></>}</AdminPage>;
}
