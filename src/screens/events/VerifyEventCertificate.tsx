import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
interface Verification { valid: boolean; title: string; event_title: string; certificate_number: string; issued_at: string }
export default function VerifyEventCertificate() {
  const { number } = useParams(), [data, setData] = useState<Verification | null>(null), [error, setError] = useState("");
  useEffect(() => { let live = true; setData(null); setError("");
    void requestRoleWorkspace(`/api/v1/certificates/verify/${encodeURIComponent(number ?? "")}`).then(value => { if (live) setData(value as Verification); })
      .catch(cause => { if (live) setError(cause instanceof Error ? cause.message : "Verification unavailable."); }); return () => { live = false; };
  }, [number]);
  return <main className="mx-auto my-12 max-w-2xl space-y-5 rounded-2xl border bg-card p-6 text-card-foreground">
    <h1 className="text-3xl font-bold">MeroTalent certificate verification</h1>
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">Verifying certificate…</p> : <><p className={`text-xl font-semibold ${data.valid ? "text-green-800" : "text-red-800"}`}>{data.valid ? "Valid certificate" : "Certificate revoked"}</p>
      <h2 className="text-xl">{data.title}</h2><p>{data.event_title}</p><p>Issued {new Date(data.issued_at).toLocaleDateString()}</p><p className="break-all">{data.certificate_number}</p></>}
    <p className="text-sm text-muted-foreground">Recipient personal information is not published here.</p><Link className="inline-block underline" to="/events">Browse MeroTalent events</Link>
  </main>;
}
