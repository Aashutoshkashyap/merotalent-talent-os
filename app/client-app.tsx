"use client";

import dynamic from "next/dynamic";

const MerotalentApp = dynamic(() => import("@/App"), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-screen place-items-center bg-[#f7f7fc]">
      <div className="flex items-center gap-3 text-sm font-medium text-[#57546a]">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[#655ee8]" />
        Preparing your workspace…
      </div>
    </main>
  ),
});

export default function ClientApp() {
  return <MerotalentApp />;
}
