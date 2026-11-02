import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
import { activitySettingsSchema, type ActivitySettings } from "@/lib/events/activity-contract";
interface Submission { id: string; revision: number; state: string; file_ids: string[]; comments: string; marks: number | null; feedback: string | null }
export default function StudentEventAssignment({ eventId, activityId, settings }: { eventId: string; activityId: string; settings?: ActivitySettings }) {
  const policy = activitySettingsSchema.parse(settings ?? {});
  const [submissions, setSubmissions] = useState<Submission[]>([]), [files, setFiles] = useState<Array<{ id: string; file_name: string }>>([]);
  const [comments, setComments] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const base = `/api/v1/events/${eventId}/activities/${activityId}/submissions`;
  const load = useCallback(async () => { try { setSubmissions(await requestRoleWorkspace(base) as Submission[]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Submissions unavailable."); } }, [base]);
  useEffect(() => { void load(); }, [load]);
  const upload = async (file: File) => {
    setBusy(true); setError("");
    try { const body = new FormData(); body.append("file", file); body.append("purpose", "assignment"); body.append("activityId", activityId);
      const uploaded = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files`, { method: "POST", body }) as { id: string; file_name: string };
      setFiles(previous => [...previous, uploaded]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); } finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true); setError("");
    try { await requestRoleWorkspace(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_ids: files.map(file => file.id), comments }) });
      setFiles([]); setComments(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Submission failed."); } finally { setBusy(false); }
  };
  const download = async (fileId: string) => {
    try { const value = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files?fileId=${fileId}`) as { signedUrl: string };
      window.open(value.signedUrl, "_blank", "noopener,noreferrer");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "File unavailable."); }
  };
  const remove = async (fileId: string) => {
    setBusy(true); setError("");
    try { await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files?fileId=${fileId}`, { method: "DELETE" }); setFiles(previous => previous.filter(file => file.id !== fileId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "File could not be removed."); } finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border p-4">
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {submissions.map(submission => <article key={submission.id} className="space-y-2 rounded-lg border p-3"><p>Revision {submission.revision} · {submission.state.replaceAll("_", " ")}</p>
      {submission.marks !== null && <p>Marks: {submission.marks}</p>}{submission.feedback && <p className="whitespace-pre-wrap">{submission.feedback}</p>}
      {submission.file_ids.map((id, index) => <Button key={id} variant="outline" size="sm" onClick={() => void download(id)}>Download file {index + 1}</Button>)}
    </article>)}
    {policy.evaluation_criteria && <p className="whitespace-pre-wrap text-sm">Evaluation criteria: {policy.evaluation_criteria}</p>}
    {policy.allow_late && policy.late_until && <p className="text-sm">Late submissions are flagged and accepted only until {new Date(policy.late_until).toLocaleString()}.</p>}
    <Label>Assignment files ({policy.allowed_extensions.join(", ").toUpperCase()}; up to {Math.round(policy.max_file_bytes / 1024)} KB each, {policy.max_files} files)<input disabled={busy || files.length >= policy.max_files} type="file" className="mt-2 block w-full rounded-lg border p-3"
      accept={policy.allowed_extensions.map(extension => `.${extension}`).join(",")} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></Label>
    <ul className="space-y-2">{files.map(file => <li key={file.id} className="flex flex-wrap gap-2">{file.file_name}<Button disabled={busy} variant="ghost" size="sm" onClick={() => void remove(file.id)}>Delete unused file</Button></li>)}</ul>
    <Label>Submission comments<Textarea value={comments} onChange={event => setComments(event.target.value)} /></Label>
    <Button disabled={busy || !files.length} onClick={() => void submit()}>{busy ? "Saving…" : "Submit assignment"}</Button>
  </section>;
}
