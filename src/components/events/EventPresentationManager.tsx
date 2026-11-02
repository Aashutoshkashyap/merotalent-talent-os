import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignedMediaUploader } from "@/components/media/SignedMediaUploader";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
interface Presentation { cover_image_url: string | null; logo_url: string | null; gallery_urls: string[]; contact_email: string | null; contact_phone: string | null }
export default function EventPresentationManager({ eventId }: { eventId: string }) {
  const [data, setData] = useState<Presentation | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const load = useCallback(async () => { try { setData(await requestRoleWorkspace(`/api/v1/events/${eventId}/presentation`) as Presentation); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Event presentation unavailable."); } }, [eventId]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    try { await requestRoleWorkspace(`/api/v1/events/${eventId}/presentation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Presentation could not be saved."); } finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-xl border p-4"><h3 className="font-semibold">Event banner, logo, gallery and public contact</h3>
    {error && <p role="alert" className="text-red-800">{error}</p>}{saved && <p role="status">Public presentation saved.</p>}
    {data && <>
      <SignedMediaUploader label="Event banner" module="event_cover" resourceId={eventId} disabled={busy} onUploaded={assets => setData(previous => ({ ...previous!, cover_image_url: assets[0]?.path ?? previous!.cover_image_url }))} />
      <SignedMediaUploader label="Event logo" module="event_cover" resourceId={eventId} disabled={busy} onUploaded={assets => setData(previous => ({ ...previous!, logo_url: assets[0]?.path ?? previous!.logo_url }))} />
      <SignedMediaUploader label="Event gallery images" module="event_cover" resourceId={eventId} disabled={busy || data.gallery_urls.length >= 10} multiple maxFiles={10 - data.gallery_urls.length} onUploaded={assets => setData(previous => ({ ...previous!, gallery_urls: [...previous!.gallery_urls, ...assets.map(asset => asset.path)].slice(0, 10) }))} />
      <p className="text-sm text-muted-foreground">Save after uploading. Removing a reference does not delete its object; the managed-media delete workflow refuses deletion while any event image still uses it.</p>
      <div className="flex flex-wrap gap-2">{data.cover_image_url && <Button variant="outline" onClick={() => setData(previous => ({ ...previous!, cover_image_url: null }))}>Remove banner reference</Button>}{data.logo_url && <Button variant="outline" onClick={() => setData(previous => ({ ...previous!, logo_url: null }))}>Remove logo reference</Button>}</div>
      {data.gallery_urls.map((path, index) => <div key={path} className="flex items-center justify-between gap-2 rounded border p-2"><span>Gallery image {index + 1}</span><Button variant="ghost" onClick={() => setData(previous => ({ ...previous!, gallery_urls: previous!.gallery_urls.filter(value => value !== path) }))}>Remove gallery reference</Button></div>)}
      <Label>Public organizer email<Input type="email" value={data.contact_email ?? ""} onChange={event => setData(previous => ({ ...previous!, contact_email: event.target.value || null }))} /></Label>
      <Label>Public organizer phone<Input type="tel" value={data.contact_phone ?? ""} onChange={event => setData(previous => ({ ...previous!, contact_phone: event.target.value || null }))} /></Label>
      <Button disabled={busy} onClick={() => void save()}>Save event presentation</Button>
    </>}
  </section>;
}
