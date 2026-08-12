import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared visual language for the operational surfaces.
 *
 * The reference dashboard is built from large white modules floating on a
 * quiet canvas. Keeping that treatment here lets data-heavy screens retain
 * their existing behaviour while reading as one intentional product.
 */
export const operationsPageClass = cn(
  "space-y-6 text-[#0f172a] max-w-[1700px] w-full mx-auto px-1 sm:px-2 lg:px-4",
  "[&>div:first-child]:rounded-[24px] [&>div:first-child]:border [&>div:first-child]:border-[#e2e8f0]",
  "[&>div:first-child]:gap-4 [&>div:first-child]:bg-[#f8fafc] [&>div:first-child]:p-4 sm:[&>div:first-child]:p-5 md:[&>div:first-child]:p-6",
  "[&>div:first-child]:shadow-[0_12px_30px_rgba(0,0,0,0.04)]",
  "[&_h1]:tracking-[-0.025em] [&_h1]:text-[#0f172a] [&_h1]:text-xl sm:[&_h1]:text-2xl font-bold",
  "[&_.bg-card]:overflow-hidden [&_.bg-card]:rounded-[22px] [&_.bg-card]:border-[#e2e8f0] [&_.bg-card]:bg-[#f8fafc]",
  "[&_.bg-card]:shadow-[0_10px_28px_rgba(0,0,0,0.03)]",
  "[&_.bg-muted]:bg-[#f1f5f9] [&_.text-primary]:text-[#071a3d]",
  "[&_.bg-primary]:bg-[#071a3d] [&_.border-primary]:border-[#071a3d]",
  "[&_.bg-gradient-to-r]:from-[#071a3d] [&_.bg-gradient-to-r]:via-[#1e3a8a] [&_.bg-gradient-to-r]:to-[#071a3d]",
  "[&_.text-secondary]:text-[#0f766e] [&_.text-success]:text-[#0f766e]",
  "[&_input]:rounded-xl [&_input]:border-[#cbd5e1] [&_input]:bg-white [&_input]:shadow-none",
  "[&_textarea]:rounded-xl [&_textarea]:border-[#cbd5e1] [&_textarea]:bg-white [&_textarea]:shadow-none",
  "[&_[role=combobox]]:rounded-xl [&_[role=combobox]]:border-[#cbd5e1] [&_[role=combobox]]:bg-white",
  "[&_button]:rounded-xl",
  /* Responsive table: horizontal scroll on small screens */
  "[&_.table-responsive]:overflow-x-auto [&_.table-responsive]:-mx-3 [&_.table-responsive]:px-3 sm:[&_.table-responsive]:mx-0 sm:[&_.table-responsive]:px-0",
  "[&_table]:min-w-[640px] sm:[&_table]:min-w-[720px] [&_thead]:bg-[#f1f5f9] [&_th]:h-11 [&_th]:font-semibold [&_th]:text-[#475569]",
  "[&_tbody_tr]:border-[#e2e8f0] [&_tbody_tr:hover]:bg-white",
  "[&_[role=tablist]]:rounded-2xl [&_[role=tablist]]:border [&_[role=tablist]]:border-[#e2e8f0]",
  "[&_[role=tablist]]:bg-[#f8fafc] [&_[role=tablist]]:p-1.5 [&_[role=tablist]]:shadow-[0_8px_20px_rgba(0,0,0,0.03)]",
  "[&_[role=tablist]]:flex-wrap",
  "[&_[role=tab][data-state=active]]:bg-[#071a3d] [&_[role=tab][data-state=active]]:text-white",
);

interface OperationsPageProps {
  children: ReactNode;
  className?: string;
}

export const OperationsPage = ({ children, className }: OperationsPageProps) => (
  <div className={cn(operationsPageClass, className)}>{children}</div>
);

export const operationsPanelClass =
  "rounded-[22px] border border-[#f1e2d7] bg-white shadow-[0_14px_38px_rgba(74,45,27,0.065)]";

export const operationsStatIconClass =
  "grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#fff1e8] text-[#c2410c]";

