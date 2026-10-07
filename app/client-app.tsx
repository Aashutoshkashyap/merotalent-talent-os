"use client";

import dynamic from "next/dynamic";
import type { CmsSnapshot } from "@/hooks/useSiteCMS";

const MerotalentApp = dynamic(() => import("@/App"), {
  ssr: false,
  loading: () => (
    <main className="workspace-canvas grid min-h-screen place-items-center px-5">
      <div className="workspace-card flex items-center gap-3 px-5 py-4 text-sm font-semibold text-[#57515e]">
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary shadow-[0_0_0_6px_rgba(249,115,22,0.12)]" />
        Preparing your workspace…
      </div>
    </main>
  ),
});

export default function ClientApp({ initialCmsSnapshot }: { initialCmsSnapshot?: CmsSnapshot | null }) {
  return <MerotalentApp initialCmsSnapshot={initialCmsSnapshot} />;
}
