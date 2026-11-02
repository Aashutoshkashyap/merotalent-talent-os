import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
interface Submission { id: string; title: string; full_name: string; revision: number; state: string; file_ids: string[]; marks: string | null; max_marks: string; feedback: string | null; is_late: boolean }
export default function EventAssignmentReview({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Submission[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = async () => {
    try { setRows(await requestRoleWorkspace(`/api/v1/events/${eventId}/activities?submissions=true`) as Submission[]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Submission review unavailable."); }
  };
  const save = async (row: Submission) => {
    setBusy(true); setError("");
    try { await requestRoleWorkspace(`/api/v1/events/${eventId}/activities`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grade", payload: { id: row.id, state: row.state, marks: row.marks === null || row.marks === "" ? null : Number(row.marks), feedback: row.feedback ?? "" } }) }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Grade not saved."); } finally { setBusy(false); }
  };
  const download = async (fileId: string) => {
    try { const value = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files?fileId=${fileId}&management=true`) as { signedUrl: string };
      window.open(value.signedUrl, "_blank", "noopener,noreferrer");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "File unavailable."); }
  };
  const field = (id: string, changes: Partial<Submission>) => setRows(previous => previous.map(row => row.id === id ? { ...row, ...changes } : row));
  return <section className="space-y-4 rounded-xl border p-4"><h3 className="font-semibold">Assignment grading</h3>
    <p className="text-sm text-muted-foreground">Registration-management permission is required. Published grades remain hidden until the activity’s result-publication time. Every review revision is retained.</p>
    <Button variant="outline" onClick={() => void load()}>Load submissions</Button>{error && <p role="alert" className="text-red-800">{error}</p>}
    {rows.map(row => <article key={row.id} className="space-y-3 rounded-lg border p-3"><h4 className="font-semibold">{row.title} · {row.full_name} · Revision {row.revision}{row.is_late ? " · Late submission" : ""}</h4>
      <div className="flex flex-wrap gap-2">{row.file_ids.map((id, index) => <Button key={id} variant="outline" onClick={() => void download(id)}>Download file {index + 1}</Button>)}</div>
      <Label>Review state<select className="block w-full rounded-lg border p-2" value={row.state} onChange={event => field(row.id, { state: event.target.value })}>{["submitted", "under_review", "resubmit_requested", "evaluated", "published", "withheld"].map(state => <option key={state}>{state}</option>)}</select></Label>
      <Label>Marks (maximum {row.max_marks})<Input type="number" min="0" step="0.01" max={row.max_marks} value={row.marks ?? ""} onChange={event => field(row.id, { marks: event.target.value })} /></Label>
      <Label>Feedback<Textarea value={row.feedback ?? ""} onChange={event => field(row.id, { feedback: event.target.value })} /></Label>
      <Button disabled={busy || row.state === "submitted"} onClick={() => void save(row)}>Save review</Button>
    </article>)}
  </section>;
}
