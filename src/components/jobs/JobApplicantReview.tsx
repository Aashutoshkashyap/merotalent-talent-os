import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Application = {
  id: string; job_title: string; job_id: string; full_name: string; email: string; phone: string;
  status: string; applied_at: string; notes: string | null; resume_url: string | null;
  cover_letter: string | null; portfolio_url: string | null; form_data: Record<string, unknown>;
  interview_at: string | null; interview_location: string | null; interview_duration_minutes: number | null;
};
const statuses: Record<string, string> = { submitted: "New", screening: "Screening", follow_up: "Yet to follow up", interview: "Interview scheduled", offered: "Selected / offered", confirmed: "Confirmed", rejected: "Rejected", withdrawn: "Withdrawn" };
const display = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((entry) => typeof entry === "object" && entry !== null
      ? Object.values(entry).filter((part) => typeof part === "string" && part.trim()).join(" · ")
      : String(entry)).filter(Boolean).join("\n");
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "Not provided";
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const fields = (a: Application): [string, unknown][] => [
  ["Applicant", a.full_name], ["Email", a.email], ["Phone", a.phone], ["Position", a.job_title],
  ["Submitted", new Date(a.applied_at).toLocaleString()], ["Status", statuses[a.status] || a.status],
  ["Skills", a.form_data.skills], ["Expected salary (NPR)", a.form_data.expectedSalary],
  ["Cover letter", a.cover_letter || a.form_data.coverLetter], ["Portfolio", a.portfolio_url || a.form_data.portfolioUrl],
  ["Available from", a.form_data.availableFrom], ["Experience", a.form_data.experienceSummary], ["Training", a.form_data.trainingSummary],
  ["Saved profile location", (a.form_data.profileSnapshot as Record<string, unknown> | undefined)?.location],
  ["Saved education history", (a.form_data.profileSnapshot as Record<string, unknown> | undefined)?.educationHistory],
  ["Saved experience history", (a.form_data.profileSnapshot as Record<string, unknown> | undefined)?.experienceHistory],
  ["Saved certifications", (a.form_data.profileSnapshot as Record<string, unknown> | undefined)?.certifications],
  ["Interview", a.interview_at ? new Date(a.interview_at).toLocaleString() : null], ["Interview location / link", a.interview_location],
  ["Duration (minutes)", a.interview_duration_minutes], ["Hiring notes", a.notes],
];

export default function JobApplicantReview() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Application[]>([]);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Application | null>(null);
  const [status, setStatus] = useState("screening");
  const [notes, setNotes] = useState("");
  const [interview, setInterview] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }, cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || "Request failed.");
    return body.data;
  }, [session?.access_token]);
  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try { setRows(await request(`/api/v1/jobs/applications?offset=${offset}`)); }
    catch (error) { setRows([]); setMessage(error instanceof Error ? error.message : "Unable to load applicants."); }
    finally { setLoading(false); }
  }, [request, offset, session]);
  useEffect(() => { void load(); }, [load]);
  const open = (a: Application) => {
    setSelected({ ...a, form_data: a.form_data || {} }); setStatus(a.status); setNotes(a.notes || "");
    const time = a.interview_at ? new Date(a.interview_at) : null;
    setInterview(time ? new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0,16) : "");
    setLocation(a.interview_location || ""); setDuration(a.interview_duration_minutes || 30); setMessage("");
  };
  const save = async () => {
    if (!selected) return;
    setBusy(true); setMessage("");
    try {
      if (status === "interview" && (!interview || new Date(interview).getTime() <= Date.now() || !location.trim())) throw new Error("Enter a future interview time and location or meeting link.");
      const result = await request("/api/v1/jobs/applications", { method: "PATCH", body: JSON.stringify({ id: selected.id, status, notes, interviewAt: status === "interview" ? new Date(interview).toISOString() : null, interviewLocation: location, duration }) });
      setMessage(`Application saved. ${result.emailStatus === "sent" ? "Email accepted by the email provider." : result.emailStatus === "not_required" ? "" : `Email was not confirmed sent (${result.emailStatus}).`}`);
      setSelected({ ...selected, status, notes, ...(status === "interview" ? { interview_at: new Date(interview).toISOString(), interview_location: location, interview_duration_minutes: duration } : {}) });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); }
    finally { setBusy(false); }
  };
  const download = async (path: unknown) => {
    if (typeof path !== "string" || !selected) return;
    try {
      const data = await request("/api/v1/media/download-url", { method: "POST", body: JSON.stringify({ module: "job_attachment", resourceId: selected.job_id, path }) });
      window.location.assign(data.signedUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to download."); }
  };
  const print = () => {
    if (!selected) return;
    const page = window.open("", "_blank");
    if (!page) { setMessage("Allow a pop-up to open the printable application."); return; }
    page.document.write(`<!doctype html><html><head><title>Job application</title><style>body{font:16px system-ui;max-width:850px;margin:40px auto;padding:20px}dt{font-weight:bold;margin-top:18px}dd{margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><h1>Job application</h1><dl>${fields(selected).map(([label,value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(display(value))}</dd>`).join("")}</dl><p>Supporting documents are available separately in the applicant review panel.</p></body></html>`);
    page.document.close(); page.opener = null;
  };
  return <section className="my-6 rounded-2xl border bg-card p-5 text-card-foreground" id="job-applicants">
    <h2 className="text-xl font-semibold">Job applications</h2>
    <p className="mb-4 text-sm text-muted-foreground">Review applicant details, follow up and schedule interviews.</p>
    <p role="status" className="text-sm">{message}</p>
    {loading ? <p>Loading applications…</p> : rows.length ? <div className="space-y-2">{rows.map(a => <button key={a.id} onClick={() => open(a)} className="flex w-full flex-wrap justify-between gap-2 rounded-lg border p-3 text-left hover:bg-muted"><span>{a.full_name || a.email}<span className="block text-sm text-muted-foreground">{a.job_title}</span></span><span>{statuses[a.status] || a.status}</span></button>)}</div> : <p>No accessible applications on this page.</p>}
    <div className="mt-3 flex gap-2"><Button variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0,offset-50))}>Previous</Button><Button variant="outline" disabled={rows.length < 50 || loading} onClick={() => setOffset(offset+50)}>Next</Button></div>
    <Dialog open={!!selected} onOpenChange={(value) => { if (!value && !busy) setSelected(null); }}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Application review</DialogTitle></DialogHeader>
      {selected && <><Button variant="outline" onClick={print}>View / Save application as PDF</Button><dl className="grid gap-3 sm:grid-cols-2">{fields(selected).map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-sm font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{display(value)}</dd></div>)}</dl>
        <div className="flex flex-wrap gap-2">{[["Resume", selected.resume_url], ["Experience letter",selected.form_data.experienceLetterUrl], ["Training document",selected.form_data.trainingDocumentUrl]].map(([label,path]) => path ? <Button key={String(label)} variant="outline" onClick={() => void download(path)}>{String(label)}</Button> : null)}</div>
        <Label htmlFor="app-status">Application status</Label><select id="app-status" className="rounded border bg-background p-2" value={status} onChange={e => setStatus(e.target.value)} disabled={busy || selected.status === "withdrawn"}>{Object.entries(statuses).map(([value,label]) => <option key={value} value={value} disabled={value === "withdrawn"}>{label}</option>)}</select>
        <Label htmlFor="app-notes">Hiring notes</Label><Textarea id="app-notes" value={notes} maxLength={5000} onChange={e => setNotes(e.target.value)} />
        {status === "interview" && <><Label htmlFor="interview-time">Interview date and time (your local timezone)</Label><Input id="interview-time" type="datetime-local" value={interview} onChange={e => setInterview(e.target.value)} /><Label htmlFor="interview-location">Location or meeting link</Label><Input id="interview-location" maxLength={1000} value={location} onChange={e => setLocation(e.target.value)} /><Label htmlFor="interview-duration">Duration in minutes</Label><Input id="interview-duration" type="number" min={5} max={480} value={duration} onChange={e => setDuration(Number(e.target.value))} /></>}
        <p role="status">{message}</p><Button disabled={busy || selected.status === "withdrawn"} onClick={() => void save()}>{busy ? "Saving…" : "Save update"}</Button></>}
    </DialogContent></Dialog>
  </section>;
}
