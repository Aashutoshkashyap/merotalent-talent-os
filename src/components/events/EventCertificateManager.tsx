import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
import { certificateTemplateSchema, certificatePresentationSchema, defaultCertificateLayout, type CertificateTemplate } from "@/lib/events/certificate-contract";
type Template = CertificateTemplate & { id: string };
const blank = (): CertificateTemplate => ({ title: "Certificate of participation", kind: "participation", background_file_id: null,
  auto_issue: true, is_active: true, layout: defaultCertificateLayout, presentation: certificatePresentationSchema.parse({}), eligibility: { activity_ids: [], require_attendance: true, minimum_percent: 0 } });
export default function EventCertificateManager({ eventId, activities }: { eventId: string; activities: Array<{ id: string; title: string }> }) {
  const [form, setForm] = useState(blank), [rows, setRows] = useState<Template[]>([]), [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [issued, setIssued] = useState<Array<{ id: string; full_name: string; title: string; certificate_number: string; revoked_at: string | null }>>([]);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [recipient, setRecipient] = useState(""), [issueTemplate, setIssueTemplate] = useState(""), [issueReason, setIssueReason] = useState(""), [notice, setNotice] = useState("");
  const base = `/api/v1/events/${eventId}/activities/certificates`;
  const issue = async () => {
    setBusy(true); setError(""); setNotice("");
    try { const result = await requestRoleWorkspace(base, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issue", payload: { user_id: recipient, template_id: issueTemplate, reason: issueReason } }) }) as Array<{ certificate_number: string }>;
      setNotice(result.length ? "Eligible certificate issued or already present. No eligibility rule was waived." : "The enrolled participant has not met the template eligibility rules. Nothing was issued.");
      await loadIssued();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Certificate issuance failed."); } finally { setBusy(false); }
  };
  const load = async () => { try { setRows(await requestRoleWorkspace(`${base}?management=true`) as Template[]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Templates unavailable."); } };
  const upload = async (file: File, target: "background" | "logo_file_id" | "signature_file_id" = "background") => {
    setBusy(true); setError("");
    try { const body = new FormData(); body.append("file", file); body.append("purpose", "certificate_template");
      const value = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files`, { method: "POST", body }) as { id: string };
      setForm(previous => target === "background" ? { ...previous, background_file_id: value.id } : { ...previous, presentation: { ...previous.presentation, [target]: value.id } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Background upload failed."); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setError("");
    try { await requestRoleWorkspace(base, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "template", payload: form, ...(editing ? { id: editing } : {}) }) });
      setEditing(undefined); setForm(blank()); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Template could not be saved."); } finally { setBusy(false); }
  };
  const loadIssued = async () => { try { setIssued(await requestRoleWorkspace(`${base}?issued=true`) as typeof issued); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Issued certificates unavailable."); } };
  const revoke = async (id: string) => {
    setBusy(true); setError("");
    try { await requestRoleWorkspace(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", payload: { id, reason: revokeReasons[id] ?? "" } }) }); await loadIssued(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Certificate could not be revoked."); } finally { setBusy(false); }
  };
  const preview = async () => {
    setBusy(true); setError("");
    try { const response = await fetch(base, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", payload: form }) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? "Preview unavailable.");
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a"); link.href = url; link.download = "merotalent-certificate-preview.pdf"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Preview unavailable."); } finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-xl border p-4"><h3 className="font-semibold">Certificates</h3>
    <p className="text-sm text-muted-foreground">Certificates are generated automatically when an eligible participant opens certificates. Payment alone never qualifies. Names are private; public verification shows the event, issue date, reference and revocation state.</p>
    <Button variant="outline" onClick={() => void load()}>Load saved templates</Button>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {rows.map(row => <article key={row.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3"><p>{row.title} · {row.kind} · {row.is_active ? "Active" : "Disabled"}</p><Button variant="outline" onClick={() => { setEditing(row.id);
      setForm(certificateTemplateSchema.parse({ title: row.title, kind: row.kind, background_file_id: row.background_file_id, layout: row.layout,
        eligibility: row.eligibility, auto_issue: row.auto_issue, is_active: row.is_active, presentation: row.presentation })); }}>Edit</Button></article>)}
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void save(); }}>
      <Label>Certificate title<Input required maxLength={160} value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} /></Label>
      <Label>Type<select className="block w-full rounded-lg border p-2" value={form.kind} onChange={event => setForm(previous => ({ ...previous, kind: event.target.value as CertificateTemplate["kind"] }))}>{["participation", "completion", "achievement"].map(kind => <option key={kind}>{kind}</option>)}</select></Label>
      <Label>Background template (PNG or JPEG)<input className="mt-2 block w-full" type="file" accept=".png,.jpg,.jpeg" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /></Label>
      <Label>Organization name<Input maxLength={160} value={form.presentation.organization_name} onChange={event => setForm(previous => ({ ...previous, presentation: { ...previous.presentation, organization_name: event.target.value } }))} /></Label>
      <Label>Authorized signatory name<Input maxLength={120} value={form.presentation.signatory_name} onChange={event => setForm(previous => ({ ...previous, presentation: { ...previous.presentation, signatory_name: event.target.value } }))} /></Label>
      <Label>Signatory designation<Input maxLength={160} value={form.presentation.signatory_designation} onChange={event => setForm(previous => ({ ...previous, presentation: { ...previous.presentation, signatory_designation: event.target.value } }))} /></Label>
      <Label className="sm:col-span-2">Certificate text<Input maxLength={400} value={form.presentation.body_text} onChange={event => setForm(previous => ({ ...previous, presentation: { ...previous.presentation, body_text: event.target.value } }))} /></Label>
      <p className="text-sm text-muted-foreground sm:col-span-2">Text placeholders: {"{{recipient}}, {{event}}, {{title}}, {{date}}, {{reference}}, {{organization}}, {{score}}, {{signatory}}, {{designation}}"}. Scores show the mean percentage across required published assessments.</p>
      {(["logo_file_id", "signature_file_id"] as const).map(target => <Label key={target}>{target === "logo_file_id" ? "Organization logo (PNG or JPEG)" : "Authorized signature image (PNG or JPEG)"}<input disabled={busy} className="mt-2 block w-full" type="file" accept=".png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, target); event.target.value = ""; }} />{form.presentation[target] && <Button type="button" variant="ghost" onClick={() => setForm(previous => ({ ...previous, presentation: { ...previous.presentation, [target]: null } }))}>Remove image reference</Button>}</Label>)}
      <Label>Minimum score on each required activity (%)<Input type="number" min="0" max="100" value={form.eligibility.minimum_percent} onChange={event => setForm(previous => ({ ...previous, eligibility: { ...previous.eligibility, minimum_percent: Number(event.target.value) } }))} /></Label>
      <Label className="flex gap-2"><input type="checkbox" checked={form.eligibility.require_attendance} onChange={event => setForm(previous => ({ ...previous, eligibility: { ...previous.eligibility, require_attendance: event.target.checked } }))} />Require recorded event check-in</Label>
      <Label className="flex gap-2"><input type="checkbox" checked={form.auto_issue} onChange={event => setForm(previous => ({ ...previous, auto_issue: event.target.checked }))} />Automatically generate when eligible</Label>
      <fieldset className="space-y-2 sm:col-span-2"><legend className="font-semibold">Required completed activities</legend>{activities.map(activity => <Label key={activity.id} className="flex gap-2"><input type="checkbox" checked={form.eligibility.activity_ids.includes(activity.id)} onChange={() => setForm(previous => ({ ...previous, eligibility: { ...previous.eligibility, activity_ids: previous.eligibility.activity_ids.includes(activity.id) ? previous.eligibility.activity_ids.filter(id => id !== activity.id) : [...previous.eligibility.activity_ids, activity.id] } }))} />{activity.title}</Label>)}</fieldset>
      <details className="sm:col-span-2"><summary className="cursor-pointer font-semibold">Certificate field positions (A4 landscape, PDF points)</summary>
        <p className="my-2 text-sm">X is the field’s horizontal center; Y is measured from the bottom. Keep fields apart from the fixed verification QR in the bottom-right corner.</p>
        {Object.entries(form.layout).map(([key, position]) => <fieldset key={key} className="my-3 grid grid-cols-3 gap-2"><legend>{key}</legend>{(["x", "y", "size"] as const).map(axis => <Label key={axis}>{axis}<Input type="number" value={position[axis]} onChange={event => setForm(previous => ({ ...previous, layout: { ...previous.layout, [key]: { ...position, [axis]: Number(event.target.value) } } }))} /></Label>)}</fieldset>)}
      </details>
      <Label className="flex gap-2"><input type="checkbox" checked={form.is_active} onChange={event => setForm(previous => ({ ...previous, is_active: event.target.checked }))} />Template active</Label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button disabled={busy}>Save template</Button><Button type="button" disabled={busy} variant="outline" onClick={() => void preview()}>Download template preview</Button><Button type="button" variant="outline" onClick={() => { setEditing(undefined); setForm(blank()); }}>New template</Button></div>
    </form>
    <form className="space-y-3 rounded-lg border p-4" onSubmit={event => { event.preventDefault(); void issue(); }}>
      <h4 className="font-semibold">Issue to an eligible enrolled participant</h4><p className="text-sm">Registration-management permission is required. Attendance, published assessment results and enrollment rules still apply; this cannot award a certificate for payment alone.</p>
      <Label>Existing participant account ID<Input required value={recipient} onChange={event => setRecipient(event.target.value)} /></Label>
      <Label>Saved certificate template<select required className="block w-full rounded-lg border p-2" value={issueTemplate} onChange={event => setIssueTemplate(event.target.value)}><option value="">Select a saved template</option>{rows.filter(row => row.is_active).map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></Label>
      <Label>Issuance reason<Input required minLength={10} maxLength={2000} value={issueReason} onChange={event => setIssueReason(event.target.value)} /></Label><Button disabled={busy}>Issue eligible certificate</Button>
    </form>{notice && <p role="status">{notice}</p>}
    <Button variant="outline" onClick={() => void loadIssued()}>View issued certificates</Button>
    {issued.map(certificate => <article key={certificate.id} className="space-y-2 rounded-lg border p-3"><p className="font-semibold">{certificate.full_name} · {certificate.title}</p><p className="break-all text-sm">{certificate.certificate_number} · {certificate.revoked_at ? "Revoked" : "Issued"}</p>
      {!certificate.revoked_at && <><Label>Revocation reason<Input minLength={10} maxLength={2000} value={revokeReasons[certificate.id] ?? ""} onChange={event => setRevokeReasons(previous => ({ ...previous, [certificate.id]: event.target.value }))} /></Label><Button disabled={busy || (revokeReasons[certificate.id] ?? "").trim().length < 10} variant="destructive" onClick={() => void revoke(certificate.id)}>Revoke certificate</Button></>}
    </article>)}
  </section>;
}

export function StudentEventCertificates({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; title: string; certificate_number: string; file_id: string; revoked_at: string | null }>>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { let live = true; setRows([]); setError("");
    void requestRoleWorkspace(`/api/v1/events/${eventId}/activities/certificates`).then(value => { if (live) setRows(value as typeof rows); })
      .catch(cause => { if (live) setError(cause instanceof Error ? cause.message : "Certificates unavailable."); });
    return () => { live = false; };
  }, [eventId]);
  const generate = async () => {
    setBusy(true); setError("");
    try { setRows(await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/certificates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate" }) }) as typeof rows); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Certificates unavailable."); } finally { setBusy(false); }
  };
  const download = async (fileId: string) => {
    try { const value = await requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files?fileId=${fileId}`) as { signedUrl: string }; window.location.assign(value.signedUrl); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Certificate file unavailable."); }
  };
  return <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">My certificates</h3>
    <Button disabled={busy} variant="outline" onClick={() => void generate()}>{busy ? "Checking eligibility…" : "Generate / view eligible certificates"}</Button>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {rows.map(row => <article key={row.id} className="space-y-2 rounded-lg border p-3"><p>{row.title} · {row.revoked_at ? "Revoked" : "Issued"}</p><p className="break-all text-sm">{row.certificate_number}</p>
      {!row.revoked_at && <Button variant="outline" onClick={() => void download(row.file_id)}>Download certificate</Button>}
      <a className="ml-3 underline" href={`/verify/certificates/${row.certificate_number}`}>Verify certificate</a></article>)}
  </section>;
}
