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
  "space-y-5 text-[#17162e]",
  "[&>div:first-child]:rounded-[24px] [&>div:first-child]:border [&>div:first-child]:border-[#f1e2d7]",
  "[&>div:first-child]:gap-4 [&>div:first-child]:bg-white [&>div:first-child]:p-3 sm:[&>div:first-child]:p-4 md:[&>div:first-child]:p-5",
  "[&>div:first-child]:shadow-[0_18px_45px_rgba(74,45,27,0.07)]",
  "[&_h1]:tracking-[-0.025em] [&_h1]:text-[#17162e] [&_h1]:text-xl sm:[&_h1]:text-2xl",
  "[&_.bg-card]:overflow-hidden [&_.bg-card]:rounded-[22px] [&_.bg-card]:border-[#f1e2d7] [&_.bg-card]:bg-white",
  "[&_.bg-card]:shadow-[0_14px_38px_rgba(74,45,27,0.065)]",
  "[&_.bg-muted]:bg-[#fff5ed] [&_.text-primary]:text-[#c2410c]",
  "[&_.bg-primary]:bg-[#c2410c] [&_.border-primary]:border-[#c2410c]",
  "[&_.bg-gradient-to-r]:from-[#c2410c] [&_.bg-gradient-to-r]:via-[#fb923c] [&_.bg-gradient-to-r]:to-[#c2410c]",
  "[&_.text-secondary]:text-[#31836b] [&_.text-success]:text-[#31836b]",
  "[&_input]:rounded-xl [&_input]:border-[#eadfd7] [&_input]:bg-[#fcfbfa] [&_input]:shadow-none",
  "[&_textarea]:rounded-xl [&_textarea]:border-[#eadfd7] [&_textarea]:bg-[#fcfbfa] [&_textarea]:shadow-none",
  "[&_[role=combobox]]:rounded-xl [&_[role=combobox]]:border-[#eadfd7] [&_[role=combobox]]:bg-[#fcfbfa]",
  "[&_button]:rounded-xl",
  /* Responsive table: horizontal scroll on small screens */
  "[&_.table-responsive]:overflow-x-auto [&_.table-responsive]:-mx-3 [&_.table-responsive]:px-3 sm:[&_.table-responsive]:mx-0 sm:[&_.table-responsive]:px-0",
  "[&_table]:min-w-[640px] sm:[&_table]:min-w-[720px] [&_thead]:bg-[#fff8f3] [&_th]:h-11 [&_th]:font-semibold [&_th]:text-[#777184]",
  "[&_tbody_tr]:border-[#f2e7df] [&_tbody_tr:hover]:bg-[#fffaf6]",
  "[&_[role=tablist]]:rounded-2xl [&_[role=tablist]]:border [&_[role=tablist]]:border-[#f1e2d7]",
  "[&_[role=tablist]]:bg-white [&_[role=tablist]]:p-1.5 [&_[role=tablist]]:shadow-[0_12px_30px_rgba(74,45,27,0.05)]",
  "[&_[role=tablist]]:flex-wrap",
  "[&_[role=tab][data-state=active]]:bg-[#c2410c] [&_[role=tab][data-state=active]]:text-white",
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

