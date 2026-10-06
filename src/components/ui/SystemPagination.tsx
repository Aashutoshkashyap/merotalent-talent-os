import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface SystemPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
  className?: string;
}

export const SystemPagination: React.FC<SystemPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = "items",
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < safeTotalPages - 2) pages.push("...");
      pages.push(safeTotalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 ${className}`}>
      {/* Items Counter Info */}
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <span>
          Showing <strong className="font-bold text-slate-900">{startItem}</strong> to{" "}
          <strong className="font-bold text-slate-900">{endItem}</strong> of{" "}
          <strong className="font-bold text-slate-900">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-500">Per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-16 text-xs bg-white border-slate-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      {safeTotalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            disabled={safeCurrentPage === 1}
            onClick={() => onPageChange(1)}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            disabled={safeCurrentPage === 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page Number Buttons */}
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((page, idx) =>
              page === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs font-bold">
                  ...
                </span>
              ) : (
                <Button
                  key={`page-${page}`}
                  variant={page === safeCurrentPage ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 rounded-lg text-xs font-bold ${
                    page === safeCurrentPage
                      ? "bg-[#071a3d] text-white hover:bg-[#05132d]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          {/* Next Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            disabled={safeCurrentPage === safeTotalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            disabled={safeCurrentPage === safeTotalPages}
            onClick={() => onPageChange(safeTotalPages)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SystemPagination;
