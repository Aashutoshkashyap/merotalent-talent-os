import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
interface Enrollment { id: string; full_name: string; payment_status: string; status: string; activity_access: string[]; access_expires_at: string | null; access_suspended: boolean }
export default function EventEnrollmentAccess({ eventId, activities }: { eventId: string; activities: Array<{ id: string; title: string }> }) {
  const [rows, setRows] = useState<Enrollment[]>([]), [selected, setSelected] = useState<Enrollment | null>(null), [reason, setReason] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = async () => { try { setRows(await requestRoleWorkspace(`/api/v1/events/${eventId}/activities?enrollments=true`) as Enrollment[]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Enrollment access unavailable."); } };
  const save = async () => {
    if (!selected) return; setBusy(true); setError("");
    try { await requestRoleWorkspace(`/api/v1/events/${eventId}/activities`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "access", payload: { id: selected.id, activity_ids: selected.activity_access, access_expires_at: selected.access_expires_at,
        access_suspended: selected.access_suspended, reason } }) }); setSelected(null); setReason(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Access could not be changed."); } finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Enrollment access and suspension</h3>
    <p className="text-sm text-muted-foreground">Explicit changes affect existing purchases and are audited. This cannot turn an unpaid registration into a paid enrollment.</p>
    <Button variant="outline" onClick={() => void load()}>Load event enrollments</Button>{error && <p role="alert" className="text-red-800">{error}</p>}
    <div className="grid gap-2 sm:grid-cols-2">{rows.map(row => <Button key={row.id} variant="outline" onClick={() => { setSelected(row); setReason(""); }}>{row.full_name} · {row.payment_status}</Button>)}</div>
    {selected && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save(); }}><p className="font-semibold">{selected.full_name}</p>
      {activities.map(activity => <Label key={activity.id} className="flex gap-2"><input type="checkbox" checked={selected.activity_access.includes(activity.id)} onChange={() => setSelected(previous => previous ? { ...previous, activity_access: previous.activity_access.includes(activity.id) ? previous.activity_access.filter(id => id !== activity.id) : [...previous.activity_access, activity.id] } : previous)} />{activity.title}</Label>)}
      <Label className="flex gap-2"><input type="checkbox" checked={selected.access_suspended} onChange={event => setSelected(previous => previous ? { ...previous, access_suspended: event.target.checked } : previous)} />Suspend activity access</Label>
      <Label>Access expiry<Input type="datetime-local" value={selected.access_expires_at ? new Date(new Date(selected.access_expires_at).getTime() - new Date(selected.access_expires_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={event => setSelected(previous => previous ? { ...previous, access_expires_at: event.target.value ? new Date(event.target.value).toISOString() : null } : previous)} /></Label>
      <Label>Reason for changing purchased access<Input required minLength={10} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></Label>
      <Button disabled={busy}>Save audited access change</Button>
    </form>}
  </section>;
}
