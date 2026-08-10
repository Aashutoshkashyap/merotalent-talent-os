"use client";

import { Building2, Filter, GraduationCap, Search, School, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { InstituteCategory, InstituteSort } from "@/lib/institutes/public-institutes";

const categories: Array<{
  value: InstituteCategory;
  label: string;
  icon: typeof GraduationCap;
}> = [
  { value: "all", label: "All", icon: GraduationCap },
  { value: "college", label: "Colleges", icon: Building2 },
  { value: "school", label: "Schools", icon: School },
  { value: "plus-two", label: "+2", icon: GraduationCap },
];

export interface InstituteFilterValues {
  location: string;
  affiliation: string;
  admissionStatus: string;
}

interface InstituteFiltersProps {
  search: string;
  category: InstituteCategory;
  sort: InstituteSort;
  filters: InstituteFilterValues;
  resultCount?: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: InstituteCategory) => void;
  onSortChange: (value: InstituteSort) => void;
  onFilterChange: (key: keyof InstituteFilterValues, value: string) => void;
  onClearFilters: () => void;
}

export default function InstituteFilters({
  search,
  category,
  sort,
  filters,
  resultCount,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onFilterChange,
  onClearFilters,
}: InstituteFiltersProps) {
  const activeFilterCount = [filters.location, filters.affiliation, filters.admissionStatus].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search colleges, schools, locations or affiliations"
            aria-label="Search education directory"
            className="h-12 rounded-2xl border-slate-200 bg-white pl-12 pr-11 text-sm font-semibold shadow-sm focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50/50 hover:text-[#0073e6] lg:flex-none"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#0073e6] px-1 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="border-slate-200 bg-white">
              <SheetHeader>
                <SheetTitle className="text-slate-900">Filter institutions</SheetTitle>
                <SheetDescription>Refine the directory by location, affiliation, and admission status.</SheetDescription>
              </SheetHeader>

              <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="directory-location" className="text-xs font-extrabold text-slate-700">Location</Label>
                  <Input
                    id="directory-location"
                    value={filters.location}
                    onChange={(event) => onFilterChange("location", event.target.value)}
                    placeholder="e.g. Kathmandu"
                    className="h-11 rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="directory-affiliation" className="text-xs font-extrabold text-slate-700">Affiliation</Label>
                  <Input
                    id="directory-affiliation"
                    value={filters.affiliation}
                    onChange={(event) => onFilterChange("affiliation", event.target.value)}
                    placeholder="e.g. Tribhuvan University"
                    className="h-11 rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-extrabold text-slate-700">Admission status</Label>
                  <Select
                    value={filters.admissionStatus || "all"}
                    onValueChange={(value) => onFilterChange("admissionStatus", value === "all" ? "" : value)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-[#0073e6]/10">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter className="mt-8 gap-2 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClearFilters}
                  disabled={activeFilterCount === 0}
                  className="rounded-xl border-slate-200"
                >
                  Clear filters
                </Button>
                <SheetClose asChild>
                  <Button type="button" className="rounded-xl bg-[#0073e6] hover:bg-[#0062c4]">
                    Show results
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={(value) => onSortChange(value as InstituteSort)}>
            <SelectTrigger className="h-12 w-[148px] rounded-2xl border-slate-200 bg-white text-xs font-extrabold text-slate-700 shadow-sm focus:ring-[#0073e6]/10 sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((item) => {
          const Icon = item.icon;
          const selected = category === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onCategoryChange(item.value)}
              aria-pressed={selected}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-extrabold transition active:scale-95 ${
                selected
                  ? "border-[#0073e6] bg-[#0073e6] text-white shadow-md shadow-blue-500/15"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50 hover:text-[#0073e6]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
        {typeof resultCount === "number" && (
          <span className="ml-auto shrink-0 pl-3 text-xs font-bold text-slate-400">
            {resultCount.toLocaleString()} results
          </span>
        )}
      </div>
    </div>
  );
}
