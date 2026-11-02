import { Fragment, useEffect, useState } from "react";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
import "katex/dist/katex.min.css";
import Image from "next/image";

/** Only KaTeX generates markup. Organizer-provided HTML remains plain React text. */
export function AssessmentContent({ text }: { text: string }) {
  const [render, setRender] = useState<((value: string, displayMode: boolean) => string) | null>(null);
  useEffect(() => {
    let live = true;
    if (text.includes("$")) void import("katex").then(module => { if (live) setRender(() => (value: string, displayMode: boolean) =>
      module.default.renderToString(value, { displayMode, throwOnError: false, trust: false, strict: "error", maxExpand: 1000, maxSize: 20 })); });
    return () => { live = false; };
  }, [text]);
  return <span className="whitespace-pre-wrap break-words">{text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g).map((part, index) =>
    render && part.startsWith("$") && part.endsWith("$") ? <span key={index} className="inline-block max-w-full overflow-x-auto align-middle"
      dangerouslySetInnerHTML={{ __html: render(part.slice(part.startsWith("$$") ? 2 : 1, part.startsWith("$$") ? -2 : -1), part.startsWith("$$")) }} /> : <Fragment key={index}>{part}</Fragment>)}</span>;
}
export function AssessmentImage({ eventId, fileId, management = false }: { eventId: string; fileId?: string | null; management?: boolean }) {
  const [url, setUrl] = useState<string | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    setUrl(null); setFailed(false);
    if (!fileId) return;
    let live = true;
    const refresh = () => void requestRoleWorkspace(`/api/v1/events/${eventId}/activities/files?fileId=${fileId}${management ? "&management=true" : ""}`)
      .then(value => { if (live) { setUrl((value as { signedUrl: string }).signedUrl); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    refresh(); const timer = setInterval(refresh, 90000);
    return () => { live = false; clearInterval(timer); };
  }, [eventId, fileId, management]);
  return !fileId ? null : failed ? <span role="status">Question image unavailable; contact the organizer.</span> : url ? <Image unoptimized src={url} width={1000} height={700} alt="Question diagram" className="my-3 h-auto max-h-80 max-w-full rounded-lg object-contain" /> : <span>Loading diagram…</span>;
}
