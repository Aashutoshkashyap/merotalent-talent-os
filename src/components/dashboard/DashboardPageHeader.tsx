import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface DashboardPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

const DashboardPageHeader = ({
  eyebrow,
  title,
  description,
  action,
}: DashboardPageHeaderProps) => (
  <section className="relative overflow-hidden rounded-[24px] border border-[#f0e2d7] bg-white px-5 py-5 shadow-[0_18px_55px_rgba(69,42,21,0.06)] sm:px-6">
    <div className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full bg-[#fff0e5]" />
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#c2410c] text-white shadow-[0_10px_24px_rgba(249,115,22,0.25)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e8670b]">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-[#19172b] sm:text-4xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#827b86] sm:text-sm">{description}</p>
        </div>
      </div>
      {action && <div className="relative shrink-0">{action}</div>}
    </div>
  </section>
);

export default DashboardPageHeader;
