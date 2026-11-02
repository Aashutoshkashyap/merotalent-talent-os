import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
import type { StudentAnswer, publicQuestion } from "@/lib/events/assessment";
import StudentEventAssignment from "./StudentEventAssignment";
import { AssessmentContent, AssessmentImage } from "./AssessmentContent";
import { StudentEventCertificates } from "./EventCertificateManager";
import type { ActivitySettings } from "@/lib/events/activity-contract";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface Activity { id: string; kind: string; title: string; instructions: string; status: string; opens_at: string; closes_at: string; last_attempt_id: string | null; settings?: ActivitySettings }
interface Attempt { id: string; state: string; started_at: string; deadline_at: string; completed_at: string | null;
  answers: Record<string, StudentAnswer>; questions: Array<ReturnType<typeof publicQuestion>>; server_time: string;
  score: number | null; total_marks: number | null; review: Array<{ id: string; correct_answer: string; explanation: string }> | null }
interface AttemptPolicy { question_count?: number; question_index?: number; navigation?: "free" | "forward_only"; require_all_answers?: boolean }
export default function StudentEventActivities({ eventId }: { eventId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]), [selected, setSelected] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<(Attempt & AttemptPolicy) | null>(null), [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [saved, setSaved] = useState(""), [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const answerRef = useRef(answers), saving = useRef(false), offset = useRef(0);
  useEffect(() => { answerRef.current = answers; }, [answers]);
  const load = useCallback(async () => {
    setLoading(true);
    try { setActivities(await requestRoleWorkspace(`/api/v1/events/${eventId}/activities`) as Activity[]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Activities unavailable."); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { setSelected(null); setAttempt(null); setAnswers({}); setError(""); void load(); }, [load]);
  const accept = (value: Attempt & AttemptPolicy) => {
    setAttempt(value); offset.current = new Date(value.server_time).getTime() - Date.now();
    setRemaining(Math.max(0, Math.ceil((new Date(value.deadline_at).getTime() - Date.now() - offset.current) / 1000)));
  };
  const save = useCallback(async (submit = false, next = false) => {
    if (!attempt || !selected || attempt.completed_at || saving.current) return;
    saving.current = true; setBusy(true); if (submit || next) setSubmitting(true);
    try {
      const value = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/${selected.id}/attempts?attemptId=${attempt.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answerRef.current, submit, next, question_index: attempt.question_index ?? 0 }),
      }) as Attempt & AttemptPolicy;
      accept(value); setSaved(new Date().toLocaleTimeString()); setError("");
      if (next) setAnswers(value.answers);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Answers could not be saved. Keep this page open and retry."); }
    finally { saving.current = false; setBusy(false); setSubmitting(false); }
  }, [attempt, selected, eventId]);
  useEffect(() => {
    if (!attempt || attempt.completed_at) return;
    const countdown = setInterval(() => setRemaining(Math.max(0, Math.ceil((new Date(attempt.deadline_at).getTime() - Date.now() - offset.current) / 1000))), 1000);
    const autosave = setInterval(() => void save(), 8000);
    return () => { clearInterval(countdown); clearInterval(autosave); };
  }, [attempt, save]);
  const open = async (activity: Activity, review = false) => {
    setBusy(true); setError("");
    try {
      const value = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/${activity.id}/attempts${review ? `?attemptId=${activity.last_attempt_id}` : ""}`, { method: review ? "GET" : "POST" }) as Attempt;
      setSelected(activity); accept(value); setAnswers(value.answers); setSaved("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Quiz unavailable."); } finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-xl border p-4" aria-label="My event activities">
    <h2 className="text-xl font-semibold">My event activities</h2>
    <StudentEventCertificates eventId={eventId} />
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}<Button variant="outline" onClick={() => void (attempt ? save() : load())}>Retry</Button></p>}
    {loading ? <p role="status">Loading your event activities…</p> : !selected ? activities.length ? activities.map(activity => <article key={activity.id} className="space-y-2 rounded-lg border p-3">
      <h3 className="font-semibold">{activity.title}</h3><p className="whitespace-pre-wrap text-sm">{activity.instructions}</p>
      <p className="text-sm">{new Date(activity.opens_at).toLocaleString()} – {new Date(activity.closes_at).toLocaleString()} · {activity.status}</p>
      {activity.kind === "quiz" && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void open(activity)}>Start / resume quiz</Button>{activity.last_attempt_id && <Button disabled={busy} variant="outline" onClick={() => void open(activity, true)}>View my last attempt</Button>}</div>}
      {activity.kind === "assignment" && <StudentEventAssignment eventId={eventId} activityId={activity.id} settings={activity.settings} />}
    </article>) : <p className="text-sm text-muted-foreground">No published activities are included in this enrollment yet.</p> : attempt && <>
      <header className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold">{selected.title}</h3><p role="timer" className="font-mono">{attempt.completed_at ? attempt.state : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} remaining`}</p>
        <p className="text-sm text-muted-foreground">{attempt.completed_at ? attempt.score === null ? "Results are not published yet." : `Score: ${attempt.score} / ${attempt.total_marks}` : saved ? `Saved at ${saved}` : "Answers save automatically every 8 seconds. The server enforces the deadline."}</p></div>
        <Button variant="outline" disabled={busy} onClick={async () => { if (!attempt.completed_at) await save(); setSelected(null); setAttempt(null); void load(); }}>Back to activities</Button></header>
      {attempt.questions.map((question, index) => <fieldset key={question.id} disabled={!!attempt.completed_at || !remaining || submitting} className="space-y-3 rounded-xl border p-4">
        <legend className="max-w-full whitespace-pre-wrap px-2 font-semibold">{index + 1 + (!attempt.completed_at && attempt.navigation === "forward_only" ? attempt.question_index ?? 0 : 0)}. <AssessmentContent text={question.question} /> ({question.points} marks)</legend>
        <AssessmentImage eventId={eventId} fileId={question.media_file_id} />
        {["single", "boolean", "multiple"].includes(question.question_type) ? question.options.map(option => <Label key={option.id} className="flex items-start gap-3 py-1"><input type={question.question_type === "multiple" ? "checkbox" : "radio"}
          name={question.id} checked={Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).includes(option.id) : answers[question.id] === option.id}
          onChange={event => setAnswers(previous => ({ ...previous, [question.id]: question.question_type === "multiple" ? event.target.checked ? [...(Array.isArray(previous[question.id]) ? previous[question.id] as string[] : []), option.id] : (previous[question.id] as string[]).filter(value => value !== option.id) : option.id }))} /><span><AssessmentContent text={option.text} /><AssessmentImage eventId={eventId} fileId={option.image_file_id} /></span></Label>)
          : <Label>Your answer<Input inputMode={question.question_type === "numerical" ? "decimal" : "text"} value={typeof answers[question.id] === "string" ? answers[question.id] as string : ""} onChange={event => setAnswers(previous => ({ ...previous, [question.id]: event.target.value }))} /></Label>}
        {attempt.review?.find(item => item.id === question.id) && <p className="text-sm text-green-800">Correct answer: {attempt.review.find(item => item.id === question.id)?.correct_answer}<br />{attempt.review.find(item => item.id === question.id)?.explanation}</p>}
      </fieldset>)}
      <p className="text-sm">Progress: {Object.values(answers).filter(answer => Array.isArray(answer) ? answer.length > 0 : !!answer.trim()).length} / {attempt.question_count ?? attempt.questions.length} answered{attempt.require_all_answers ? " · All answers are required before submission." : " · Unanswered questions are permitted."}</p>
      {!attempt.completed_at && <div className="flex flex-wrap gap-3"><Button disabled={busy} variant="outline" onClick={() => void save()}>Save answers</Button>
        {attempt.navigation === "forward_only" && (attempt.question_index ?? 0) < (attempt.question_count ?? 1) - 1 && <Button disabled={busy} onClick={() => void save(false, true)}>Save and next question</Button>}
        <Button disabled={busy} onClick={() => setConfirmSubmit(true)}>Submit attempt</Button></div>}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Submit this quiz attempt?</AlertDialogTitle><AlertDialogDescription>Answers cannot be changed after final submission. The server will grade only answers saved within the deadline.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep answering</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => void save(true)}>Confirm submission</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>}
  </section>;
}
