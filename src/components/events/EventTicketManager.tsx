import { Label as InputFieldLabel } from "@/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
import type { EventTicketType } from "@/lib/events/events-client";

type Tier = EventTicketType & { reserved_quantity?: number };
const blank = () => ({ name:"",description:"",ticket_kind:"individual",price:"0",total_quantity:"",
  min_team_size:"2",max_team_size:"4",min_per_order:"1",max_per_order:"10",sales_start_at:"",sales_end_at:"",benefits:"",is_active:true });
const localDate = (date?: string | null) => date ? new Date(new Date(date).getTime()-new Date(date).getTimezoneOffset()*60000).toISOString().slice(0,16) : "";

/** Same scoped server workflow for Super Admin and assigned event organizers. */
export default function EventTicketManager({ eventId }: { eventId:string }) {
  const [tiers,setTiers]=useState<Tier[]>([]), [form,setForm]=useState(blank), [editing,setEditing]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const load=useCallback(async()=>{
    try { setTiers(await requestRoleWorkspace(`/api/v1/events/${eventId}/ticket-configuration`) as Tier[]); }
    catch(cause){setError(cause instanceof Error ? cause.message : "Ticket configuration unavailable.");}
  },[eventId]);
  useEffect(()=>{setForm(blank());setEditing(null);void load();},[load]);
  const field=(key:keyof ReturnType<typeof blank>,value:string|boolean)=>setForm(previous=>({...previous,[key]:value}));
  const save=async()=>{
    setBusy(true);setError("");
    try {
      await requestRoleWorkspace(`/api/v1/events/${eventId}/ticket-configuration${editing ? `?ticketId=${editing}` : ""}`,{
        method:editing ? "PATCH" : "POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          name:form.name,description:form.description || null,ticket_kind:form.ticket_kind,price:Number(form.price),currency:"NPR",
          total_quantity:form.total_quantity ? Number(form.total_quantity) : null,
          min_team_size:form.ticket_kind==="individual" ? 1 : Number(form.min_team_size),max_team_size:form.ticket_kind==="individual" ? 1 : Number(form.max_team_size),
          min_per_order:form.ticket_kind==="individual" ? Number(form.min_per_order) : 1,max_per_order:form.ticket_kind==="individual" ? Number(form.max_per_order) : 1,
          sales_start_at:form.sales_start_at ? new Date(form.sales_start_at).toISOString() : null,sales_end_at:form.sales_end_at ? new Date(form.sales_end_at).toISOString() : null,
          eligibility_rules:{benefits:form.benefits.split("\n").map(item=>item.trim()).filter(Boolean)},is_active:form.is_active,
        })});
      setEditing(null);setForm(blank());await load();
    }catch(cause){setError(cause instanceof Error ? cause.message : "Ticket could not be saved.");}finally{setBusy(false);}
  };
  return <section className="space-y-4" aria-label="Event ticket configuration">
    <p className="text-sm text-slate-600">Individual prices are per attendee. Group prices cover one entire group per order; capacity counts every member. Existing bookings and payments are preserved when a tier is edited.</p>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}
    <div className="flex flex-wrap gap-2">{["Early Bird","Regular","Group Booking","Silver Tier"].map(name=><Button key={name} variant="outline" size="sm" onClick={()=>{setEditing(null);setForm({...blank(),name,ticket_kind:name==="Group Booking" ? "group" : "individual"});}}>{name}</Button>)}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <InputFieldLabel className="text-sm">Category name<Input value={form.name} onChange={e=>field("name",e.target.value)} /></InputFieldLabel>
      <InputFieldLabel className="text-sm">Pricing unit<select value={form.ticket_kind} onChange={e=>field("ticket_kind",e.target.value)} className="block w-full rounded-lg border bg-white p-2"><option value="individual">Per attendee</option><option value="group">Per group</option><option value="team">Per team</option></select></InputFieldLabel>
      <InputFieldLabel className="text-sm">Price (NPR)<Input type="number" min="0" step="0.01" value={form.price} onChange={e=>field("price",e.target.value)} /></InputFieldLabel>
      <InputFieldLabel className="text-sm">Inventory (groups for group tiers)<Input type="number" min="1" value={form.total_quantity} placeholder="Unlimited" onChange={e=>field("total_quantity",e.target.value)} /></InputFieldLabel>
      {form.ticket_kind==="individual" ? <>
        <InputFieldLabel className="text-sm">Minimum per order<Input type="number" min="1" max="10" value={form.min_per_order} onChange={e=>field("min_per_order",e.target.value)} /></InputFieldLabel>
        <InputFieldLabel className="text-sm">Maximum per order<Input type="number" min="1" max="10" value={form.max_per_order} onChange={e=>field("max_per_order",e.target.value)} /></InputFieldLabel>
      </> : <>
        <InputFieldLabel className="text-sm">Minimum group size<Input type="number" min="1" max="100" value={form.min_team_size} onChange={e=>field("min_team_size",e.target.value)} /></InputFieldLabel>
        <InputFieldLabel className="text-sm">Maximum group size<Input type="number" min="1" max="100" value={form.max_team_size} onChange={e=>field("max_team_size",e.target.value)} /></InputFieldLabel>
      </>}
      <InputFieldLabel className="text-sm">Sale starts (local)<Input type="datetime-local" value={form.sales_start_at} onChange={e=>field("sales_start_at",e.target.value)} /></InputFieldLabel>
      <InputFieldLabel className="text-sm">Sale ends (local)<Input type="datetime-local" value={form.sales_end_at} onChange={e=>field("sales_end_at",e.target.value)} /></InputFieldLabel>
      <InputFieldLabel className="text-sm sm:col-span-2">Description<Textarea value={form.description} onChange={e=>field("description",e.target.value)} /></InputFieldLabel>
      <InputFieldLabel className="text-sm sm:col-span-2">Benefits (one per line)<Textarea value={form.benefits} onChange={e=>field("benefits",e.target.value)} /></InputFieldLabel>
    </div>
    <InputFieldLabel className="flex gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e=>field("is_active",e.target.checked)} />On sale</InputFieldLabel>
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !form.name.trim()} onClick={()=>void save()}>{busy ? "Saving…" : editing ? "Save tier" : "Add tier"}</Button>
      <Button variant="outline" onClick={()=>{field("price","10");field("description",`${form.description ? `${form.description} ` : ""}Temporary NPR 10 payment-testing tier.`);}}>Use temporary NPR 10 test price</Button>
      {editing && <Button variant="ghost" onClick={()=>{setEditing(null);setForm(blank());}}>Cancel edit</Button>}</div>
    <div className="space-y-2">{tiers.map(tier=><article key={tier.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
      <div><h3 className="font-semibold">{tier.name}</h3><p className="text-sm">NPR {Number(tier.price)} / {tier.ticket_kind==="individual" ? "attendee" : "group"} · {tier.reserved_quantity ?? tier.quantity_sold} reserved / {tier.total_quantity ?? "unlimited"} · {tier.is_active ? "On sale" : "Hidden"}</p></div>
      <Button variant="outline" size="sm" onClick={()=>{setEditing(tier.id);setForm({name:tier.name,description:tier.description || "",ticket_kind:tier.ticket_kind,price:String(tier.price),total_quantity:tier.total_quantity==null ? "" : String(tier.total_quantity),min_team_size:String(tier.min_team_size),max_team_size:String(tier.max_team_size),min_per_order:String(tier.min_per_order),max_per_order:String(tier.max_per_order),sales_start_at:localDate(tier.sales_start_at),sales_end_at:localDate(tier.sales_end_at),benefits:tier.eligibility_rules?.benefits?.join("\n") || "",is_active:tier.is_active});}}>Edit {tier.name}</Button>
    </article>)}</div>
  </section>;
}
