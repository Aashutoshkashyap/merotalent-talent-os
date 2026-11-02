import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
import type { z } from "zod";
import { activitySettingsSchema, type activitySchema, type ActivitySettings } from "@/lib/events/activity-contract";
import type { AssessmentQuestion } from "@/lib/events/assessment";
import EventAssignmentReview from "./EventAssignmentReview";
import EventCertificateManager from "./EventCertificateManager";
import EventEnrollmentAccess from "./EventEnrollmentAccess";
import EventPresentationManager from "./EventPresentationManager";
import { AssessmentContent, AssessmentImage } from "./AssessmentContent";
import { eventExportKinds } from "@/lib/events/export";

type Activity = z.infer<typeof activitySchema> & { id: string };
type Data = { activities: Activity[]; questions: AssessmentQuestion[]; tickets: Array<{ id: string; name: string; ticket_kind: string }> };
const dateInput = (value: string) => new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const blank = (): Omit<Activity, "id"> => ({ kind: "quiz", title: "", instructions: "", status: "draft",
  opens_at: new Date().toISOString(), closes_at: new Date(Date.now() + 86400000).toISOString(), duration_seconds: 1800,
  max_attempts: 1, max_marks: 100, results_publish_at: null, review_answers: false, ticket_type_ids: [], question_ids: [], settings: activitySettingsSchema.parse({}) });
export default function EventActivityManager({ eventId, onEnrollmentChanged }: { eventId: string; onEnrollmentChanged?: () => void }) {
  // Scope changes must discard drafts, selections and late responses from the old event.
  return <EventActivityEditor key={eventId} eventId={eventId} onEnrollmentChanged={onEnrollmentChanged} />;
}
function EventActivityEditor({ eventId, onEnrollmentChanged }: { eventId: string; onEnrollmentChanged?: () => void }) {
  const [data, setData] = useState<Data | null>(null), [form, setForm] = useState(blank), [editing, setEditing] = useState<string>();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [question, setQuestion] = useState(""), [options, setOptions] = useState(""), [correct, setCorrect] = useState("");
  const [questionType, setQuestionType] = useState<AssessmentQuestion["question_type"]>("single"), [points, setPoints] = useState(1);
  const [questionImage, setQuestionImage] = useState<string | null>(null), [optionImages, setOptionImages] = useState<Record<string, string>>({});
  const [negativeMarks, setNegativeMarks] = useState(0), [tolerance, setTolerance] = useState(0), [explanation, setExplanation] = useState("");
  const [questionEditing, setQuestionEditing] = useState<string>(), [questionStatus, setQuestionStatus] = useState<AssessmentQuestion["status"]>("published");
  const [partialCredit, setPartialCredit] = useState(false), [caseSensitive, setCaseSensitive] = useState(false);
  const [studentId, setStudentId] = useState(""), [reason, setReason] = useState(""), [enrollKey, setEnrollKey] = useState(() => crypto.randomUUID());
  const [enrollActivities, setEnrollActivities] = useState<string[]>([]), [enrollTicket, setEnrollTicket] = useState(""), [enrollExpiry, setEnrollExpiry] = useState("");
  const load = useCallback(async () => {
    try { setData(await requestRoleWorkspace(`/api/v1/events/${eventId}/activities?management=true`) as Data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Activity management unavailable."); }
  }, [eventId]);
  useEffect(() => { setData(null); setForm(blank()); setEditing(undefined); void load(); }, [load]);
  const action = async (type: "question" | "activity" | "enroll", payload: unknown, id?: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await requestRoleWorkspace(`/api/v1/events/${eventId}/activities`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type, payload, ...(id ? { id } : {}) }) });
      setNotice("Saved. Existing paid activity-access snapshots and quiz attempts are preserved.");
      if (type === "activity") { setEditing(undefined); setForm(blank()); }
      if (type === "question") { setQuestion(""); setOptions(""); setCorrect(""); setQuestionImage(null); setOptionImages({}); setQuestionEditing(undefined); }
      if (type === "enroll") { setEnrollKey(crypto.randomUUID()); setStudentId(""); setReason(""); }
      await load();
      if (type === "enroll") onEnrollmentChanged?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed."); } finally { setBusy(false); }
  };
  const field = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const setting = <K extends keyof ActivitySettings>(key: K, value: ActivitySettings[K]) => setForm(previous => ({ ...previous, settings: { ...previous.settings, [key]: value } }));
  const toggle = (key: "ticket_type_ids" | "question_ids", id: string) => field(key, form[key].includes(id) ? form[key].filter(value => value !== id) : [...form[key], id]);
  const uploadQuestionImage = async (file: File, option?: string) => {
    setBusy(true); setError("");
    try { const body = new FormData(); body.append("file", file); body.append("purpose", "question");
      const value = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files`, { method: "POST", body }) as { id: string };
      if (option) setOptionImages(previous => ({ ...previous, [option]: value.id })); else setQuestionImage(value.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Question image upload failed."); } finally { setBusy(false); }
  };
  return <section className="space-y-5" aria-label="Event activity management">
    <h2 className="text-xl font-bold">Activities and competition access</h2>
    <Button variant="outline" disabled={busy} onClick={() => void load()}>Refresh activities and ticket types</Button>
    <p className="text-sm text-muted-foreground">Activity windows are independent of the physical event. Ticket access is captured at purchase; changing a tier does not silently change existing purchases.</p>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-900">{notice}</p>}
    {!data ? <Button variant="outline" onClick={() => void load()}>Load activity configuration</Button> : <>
      <EventPresentationManager eventId={eventId} />
      <div className="space-y-2">{data.activities.map(activity => <article key={activity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div><h3 className="font-semibold">{activity.title}</h3><p className="text-sm">{activity.kind} · {activity.status} · {new Date(activity.opens_at).toLocaleString()} – {new Date(activity.closes_at).toLocaleString()}</p></div>
        <Button variant="outline" onClick={() => { setEditing(activity.id); const values = blank();
          for (const key of Object.keys(values) as Array<keyof typeof values>) Object.assign(values, { [key]: activity[key] });
          values.max_marks = Number(values.max_marks); values.settings = activitySettingsSchema.parse(values.settings ?? {}); setForm(values); }}>Edit activity</Button>
      </article>)}</div>
      <form className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void action("activity", form, editing); }}>
        <h3 className="font-semibold sm:col-span-2">{editing ? "Edit" : "Create"} activity</h3>
        <Label>Title<Input required value={form.title} onChange={event => field("title", event.target.value)} /></Label>
        <Label>Type<select disabled={!!editing} className="block w-full rounded-lg border p-2" value={form.kind} onChange={event => field("kind", event.target.value as Activity["kind"])}><option value="quiz">Quiz</option><option value="assignment">Assignment</option></select></Label>
        <Label className="sm:col-span-2">Instructions<Textarea value={form.instructions} onChange={event => field("instructions", event.target.value)} /></Label>
        <Label>Opens at<Input required type="datetime-local" value={dateInput(form.opens_at)} onChange={event => { if (event.target.value) field("opens_at", new Date(event.target.value).toISOString()); }} /></Label>
        <Label>Closes at<Input required type="datetime-local" value={dateInput(form.closes_at)} onChange={event => { if (event.target.value) field("closes_at", new Date(event.target.value).toISOString()); }} /></Label>
        <Label>Time limit (seconds)<Input required type="number" min="60" max="86400" value={form.duration_seconds} onChange={event => field("duration_seconds", Number(event.target.value))} /></Label>
        <Label>Attempts permitted<Input required type="number" min="1" max="10" value={form.max_attempts} onChange={event => field("max_attempts", Number(event.target.value))} /></Label>
        {form.kind === "quiz" ? <>
          <Label>Question navigation<select className="block w-full rounded-lg border p-2" value={form.settings.navigation} onChange={event => setting("navigation", event.target.value as ActivitySettings["navigation"])}><option value="free">Revisit any question</option><option value="forward_only">Forward only — no answer changes after Next</option></select></Label>
          <Label className="flex items-center gap-2"><input type="checkbox" checked={form.settings.require_all_answers} onChange={event => setting("require_all_answers", event.target.checked)} />Require every answer before manual submission</Label>
        </> : <>
          <Label>Maximum assignment marks<Input type="number" min="0.01" max="100000" step="0.01" value={form.max_marks} onChange={event => field("max_marks", Number(event.target.value))} /></Label>
          <Label>Maximum files per submission<Input type="number" min="1" max="10" value={form.settings.max_files} onChange={event => setting("max_files", Number(event.target.value))} /></Label>
          <Label>Maximum file size (KB, up to 4096)<Input type="number" min="1" max="4096" value={form.settings.max_file_bytes / 1024} onChange={event => setting("max_file_bytes", Math.floor(Number(event.target.value) * 1024))} /></Label>
          <fieldset className="space-y-2"><legend className="font-semibold">Permitted file extensions</legend>{["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "webp", "zip"].map(extension => <Label key={extension} className="mr-3 inline-flex gap-2"><input type="checkbox" checked={form.settings.allowed_extensions.includes(extension as typeof form.settings.allowed_extensions[number])} onChange={() => setting("allowed_extensions", form.settings.allowed_extensions.includes(extension as typeof form.settings.allowed_extensions[number]) ? form.settings.allowed_extensions.filter(value => value !== extension) : [...form.settings.allowed_extensions, extension as typeof form.settings.allowed_extensions[number]])} />{extension.toUpperCase()}</Label>)}</fieldset>
          <Label className="flex gap-2"><input type="checkbox" checked={form.settings.allow_resubmission} onChange={event => setting("allow_resubmission", event.target.checked)} />Allow revisions up to the configured attempt limit</Label>
          <Label className="flex gap-2"><input type="checkbox" checked={form.settings.allow_late} onChange={event => setting("allow_late", event.target.checked)} />Accept and flag late submissions</Label>
          {form.settings.allow_late && <Label>Final late deadline<Input required type="datetime-local" value={form.settings.late_until ? dateInput(form.settings.late_until) : ""} onChange={event => setting("late_until", event.target.value ? new Date(event.target.value).toISOString() : null)} /></Label>}
          <Label className="sm:col-span-2">Evaluation criteria<Textarea value={form.settings.evaluation_criteria} onChange={event => setting("evaluation_criteria", event.target.value)} /></Label>
        </>}
        <Label>Status<select className="block w-full rounded-lg border p-2" value={form.status} onChange={event => field("status", event.target.value as Activity["status"])}>{["draft", "published", "paused", "closed"].map(status => <option key={status}>{status}</option>)}</select></Label>
        <Label>Publish scores at<Input type="datetime-local" value={form.results_publish_at ? dateInput(form.results_publish_at) : ""} onChange={event => field("results_publish_at", event.target.value ? new Date(event.target.value).toISOString() : null)} /></Label>
        <Label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={form.review_answers} onChange={event => field("review_answers", event.target.checked)} />Allow answer review after closing and results publication</Label>
        <fieldset className="space-y-2"><legend className="font-semibold">Included ticket types</legend>{data.tickets.map(ticket => <Label key={ticket.id} className="flex gap-2"><input type="checkbox" checked={form.ticket_type_ids.includes(ticket.id)} onChange={() => toggle("ticket_type_ids", ticket.id)} />{ticket.name}</Label>)}</fieldset>
        {form.kind === "quiz" && <fieldset className="space-y-2"><legend className="font-semibold">Published question bank</legend>{data.questions.filter(item => item.status === "published").map(item => <Label key={item.id} className="flex gap-2"><input type="checkbox" checked={form.question_ids.includes(item.id)} onChange={() => toggle("question_ids", item.id)} />{item.question.slice(0, 120)} ({item.points} marks)</Label>)}</fieldset>}
        {form.kind === "quiz" && <details className="space-y-3 sm:col-span-2"><summary className="cursor-pointer font-semibold">Student-view quiz preview — {data.questions.filter(question => form.question_ids.includes(question.id)).reduce((sum, question) => sum + Number(question.points), 0)} total marks</summary>
          <p className="whitespace-pre-wrap">{form.instructions}</p>{form.question_ids.map((id, index) => { const question = data.questions.find(value => value.id === id); return question ? <article key={id} className="my-3 space-y-2 rounded-lg border p-3"><p>{index + 1}. <AssessmentContent text={question.question} /></p><AssessmentImage eventId={eventId} fileId={question.media_file_id} management />{question.options.map(option => <div key={option.id} className="rounded border p-2"><AssessmentContent text={option.text} /><AssessmentImage eventId={eventId} fileId={option.image_file_id} management /></div>)}</article> : null; })}</details>}
        <div className="flex gap-2 sm:col-span-2"><Button disabled={busy}>{busy ? "Saving…" : "Save activity"}</Button><Button type="button" variant="outline" onClick={() => { setEditing(undefined); setForm(blank()); }}>New activity</Button></div>
      </form>
      <form className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const choices = options.split("\n").map(line => line.trim()).filter(Boolean).map((text, index) => ({ id: String(index + 1), text }));
        void action("question", { ...(questionEditing ? { id: questionEditing } : {}), question, question_type: questionType, options: choices.map(choice => ({ ...choice, image_file_id: optionImages[choice.id] ?? null })), correct_answer: questionType === "multiple" ? JSON.stringify(correct.split(",").map(value => value.trim())) : correct,
          points, media_file_id: questionImage, answer_rules: { negative_marks: negativeMarks, tolerance, partial_credit: partialCredit, case_sensitive: caseSensitive, explanation }, status: questionStatus }); }}>
        <h3 className="font-semibold sm:col-span-2">{questionEditing ? "Edit question" : "Add to question bank"}</h3>
        <Label className="sm:col-span-2">Question<Textarea required value={question} onChange={event => setQuestion(event.target.value)} /></Label>
        <p className="text-sm text-muted-foreground sm:col-span-2">Use $...$ for inline math or $$...$$ for display equations. HTML is not accepted.</p>
        <div className="sm:col-span-2"><AssessmentContent text={question} /><AssessmentImage eventId={eventId} fileId={questionImage} management /></div>
        <Label className="sm:col-span-2">Question diagram<input disabled={busy} className="mt-2 block w-full" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadQuestionImage(file); event.target.value = ""; }} /></Label>
        <Label>Question type<select className="block w-full rounded-lg border p-2" value={questionType} onChange={event => setQuestionType(event.target.value as typeof questionType)}>{["single", "multiple", "boolean", "numerical", "short_text"].map(type => <option key={type}>{type}</option>)}</select></Label>
        <Label>Marks<Input type="number" min="0.01" step="0.01" value={points} onChange={event => setPoints(Number(event.target.value))} /></Label>
        <Label>Question state<select className="block w-full rounded-lg border p-2" value={questionStatus} onChange={event => setQuestionStatus(event.target.value as typeof questionStatus)}>{["draft", "published", "archived"].map(status => <option key={status}>{status}</option>)}</select></Label>
        {questionType === "multiple" && <Label className="flex gap-2"><input type="checkbox" checked={partialCredit} onChange={event => setPartialCredit(event.target.checked)} />Partial credit for a correct subset with no wrong choices</Label>}
        {questionType === "short_text" && <Label className="flex gap-2"><input type="checkbox" checked={caseSensitive} onChange={event => setCaseSensitive(event.target.checked)} />Case-sensitive text matching</Label>}
        {["single", "multiple", "boolean"].includes(questionType) && <Label>Options in order (one per line)<Textarea required value={options} onChange={event => setOptions(event.target.value)} /></Label>}
        {options.split("\n").map(line => line.trim()).filter(Boolean).map((line, index) => <Label key={index}>Option {index + 1} diagram<input disabled={busy} className="mt-2 block w-full" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadQuestionImage(file, String(index + 1)); event.target.value = ""; }} /><AssessmentImage eventId={eventId} fileId={optionImages[String(index + 1)]} management /></Label>)}
        <Label>Correct answer {questionType === "multiple" ? "(option numbers, comma-separated)" : ["single", "boolean"].includes(questionType) ? "(option number)" : ""}<Input required value={correct} onChange={event => setCorrect(event.target.value)} /></Label>
        <Label>Negative marks for an incorrect answer<Input type="number" min="0" step="0.01" value={negativeMarks} onChange={event => setNegativeMarks(Number(event.target.value))} /></Label>
        {questionType === "numerical" && <Label>Numerical tolerance<Input type="number" min="0" step="any" value={tolerance} onChange={event => setTolerance(Number(event.target.value))} /></Label>}
        <Label className="sm:col-span-2">Explanation (hidden until permitted post-competition review)<Textarea value={explanation} onChange={event => setExplanation(event.target.value)} /></Label>
        <Button disabled={busy} className="sm:col-span-2">Save question</Button>
      </form>
      <div className="space-y-2"><h3 className="font-semibold">Reusable question bank</h3>{data.questions.map(question => <article key={question.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"><div><AssessmentContent text={question.question} /><p className="text-sm">{question.question_type} · {question.status} · {question.points} marks</p></div><Button variant="outline" onClick={() => {
        setQuestionEditing(question.id); setQuestion(question.question); setQuestionType(question.question_type); setOptions(question.options.map(option => option.text).join("\n"));
        const numberOf = (id: string) => String(question.options.findIndex(option => option.id === id) + 1);
        setCorrect(question.question_type === "multiple" ? (JSON.parse(question.correct_answer) as string[]).map(numberOf).join(",") : ["single", "boolean"].includes(question.question_type) ? numberOf(question.correct_answer) : question.correct_answer);
        setPoints(Number(question.points)); setQuestionStatus(question.status); setQuestionImage(question.media_file_id);
        setOptionImages(Object.fromEntries(question.options.filter(option => option.image_file_id).map(option => [numberOf(option.id), option.image_file_id!])));
        const rules = question.answer_rules; setNegativeMarks(rules.negative_marks); setTolerance(rules.tolerance); setExplanation(rules.explanation); setPartialCredit(rules.partial_credit); setCaseSensitive(rules.case_sensitive);
      }}>Edit bank question</Button></article>)}</div>
      <EventAssignmentReview eventId={eventId} />
      <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Scoped event exports</h3>
        <p className="text-sm text-muted-foreground">CSV exports require registration-management access, are audited, and include up to 5,000 records. They never include payment credentials, private file URLs or QR bearer tokens.</p>
        <div className="flex flex-wrap gap-3">{eventExportKinds.map(kind => <a key={kind} href={`/api/v1/events/${eventId}/activities?export=${kind}`} download className="rounded-lg border px-3 py-2 text-sm capitalize">Export {kind}</a>)}</div>
      </section>
      <EventEnrollmentAccess eventId={eventId} activities={data.activities.map(activity => ({ id: activity.id, title: activity.title ?? "Activity" }))} />
      <EventCertificateManager eventId={eventId} activities={data.activities.map(activity => ({ id: activity.id, title: activity.title ?? "Activity" }))} />
      <form className="grid gap-4 rounded-xl border p-4" onSubmit={event => { event.preventDefault(); void action("enroll", { user_id: studentId,
        activity_ids: enrollActivities, ticket_type_id: enrollTicket || null,
        access_expires_at: enrollExpiry ? new Date(enrollExpiry).toISOString() : null, reason, idempotency_key: enrollKey }); }}>
        <h3 className="font-semibold">Manual enrollment of an existing student</h3>
        <p className="text-sm text-muted-foreground">An explicit complimentary enrollment is audited; it is never recorded as a successful payment.</p>
        <Label>Existing student account ID<Input required value={studentId} onChange={event => { setStudentId(event.target.value); setEnrollKey(crypto.randomUUID()); }} /></Label>
        <Label>Ticket category<select className="block w-full rounded-lg border p-2" value={enrollTicket} onChange={event => { setEnrollTicket(event.target.value); setEnrollKey(crypto.randomUUID()); }}><option value="">Complimentary general admission</option>{data.tickets.filter(ticket => ticket.ticket_kind === "individual").map(ticket => <option key={ticket.id} value={ticket.id}>{ticket.name}</option>)}</select></Label>
        <p className="text-sm text-muted-foreground">Manual enrollment adds one existing student at a time. Group and team purchases use the normal ticket checkout.</p>
        <Label>Access expiry (optional)<Input type="datetime-local" value={enrollExpiry} onChange={event => { setEnrollExpiry(event.target.value); setEnrollKey(crypto.randomUUID()); }} /></Label>
        <fieldset><legend className="font-semibold">Explicit activity access</legend>{data.activities.map(activity => <Label key={activity.id} className="flex gap-2"><input type="checkbox" checked={enrollActivities.includes(activity.id)} onChange={() => { setEnrollActivities(previous => previous.includes(activity.id) ? previous.filter(id => id !== activity.id) : [...previous, activity.id]); setEnrollKey(crypto.randomUUID()); }} />{activity.title}</Label>)}</fieldset>
        <Label>Reason for complimentary access<Textarea required minLength={10} value={reason} onChange={event => { setReason(event.target.value); setEnrollKey(crypto.randomUUID()); }} /></Label>
        <Button disabled={busy}>Enroll student</Button>
      </form>
    </>}
  </section>;
}
