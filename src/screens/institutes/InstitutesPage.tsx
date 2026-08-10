"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import InstituteCard from "@/components/institutes/InstituteCard";
import InstituteFilters, {
  type InstituteFilterValues,
} from "@/components/institutes/InstituteFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchPublicInstitutes,
  type InstituteCategory,
  type InstituteSort,
} from "@/lib/institutes/public-institutes";

const PAGE_SIZE = 12;
const validCategories = new Set<InstituteCategory>(["all", "college", "school", "plus-two"]);
const validSorts = new Set<InstituteSort>(["recommended", "name", "newest"]);

const parseCategory = (value: string | null): InstituteCategory =>
  value && validCategories.has(value as InstituteCategory) ? (value as InstituteCategory) : "all";

const parseSort = (value: string | null): InstituteSort =>
  value && validSorts.has(value as InstituteSort) ? (value as InstituteSort) : "recommended";

function DirectorySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading institutions">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
          <Skeleton className="aspect-video w-full rounded-none bg-slate-100" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-4/5 bg-slate-100" />
            <Skeleton className="h-4 w-3/5 bg-slate-100" />
            <Skeleton className="h-px w-full bg-slate-100" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-3 w-full bg-slate-100" />
              <Skeleton className="h-3 w-full bg-slate-100" />
              <Skeleton className="h-3 w-4/5 bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InstitutesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const category = parseCategory(searchParams.get("category"));
  const sort = parseSort(searchParams.get("sort"));
  const filters: InstituteFilterValues = useMemo(
    () => ({
      location: searchParams.get("location") || "",
      affiliation: searchParams.get("affiliation") || "",
      admissionStatus: searchParams.get("admission") || "",
    }),
    [searchParams],
  );

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all" || (key === "sort" && value === "recommended")) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => setSearchInput(urlSearch), [urlSearch]);

  useEffect(() => {
    if (searchInput === urlSearch) return;
    const timer = window.setTimeout(() => updateParams({ q: searchInput.trim() }), 350);
    return () => window.clearTimeout(timer);
    // updateParams intentionally reads the latest search parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, urlSearch]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [urlSearch, category, filters.location, filters.affiliation, filters.admissionStatus, sort]);

  const directoryQuery = useQuery({
    queryKey: [
      "institute-directory",
      urlSearch,
      category,
      filters.location,
      filters.affiliation,
      filters.admissionStatus,
      sort,
      limit,
    ],
    queryFn: () =>
      fetchPublicInstitutes({
        search: urlSearch,
        category,
        location: filters.location,
        affiliation: filters.affiliation,
        admissionStatus: filters.admissionStatus,
        sort,
        limit,
      }),
    retry: 1,
  });

  const institutes = directoryQuery.data?.institutes ?? [];
  const totalCount = directoryQuery.data?.count;
  const hasMore = typeof totalCount === "number" && institutes.length < totalCount;

  return (
    <PublicPageLayout activeNavId="colleges">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <header className="mb-8 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0073e6]">
            <Building2 className="h-3.5 w-3.5" />
            Education directory
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">
            Find the right place to learn
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
            Explore colleges, schools and +2 institutions across Nepal, compare programs, and apply through MeroTalent.
          </p>
        </header>

        <section aria-label="Directory search and filters" className="mb-8 rounded-[24px] border border-slate-200/90 bg-slate-50/70 p-4 shadow-sm sm:p-5">
          <InstituteFilters
            search={searchInput}
            category={category}
            sort={sort}
            filters={filters}
            resultCount={totalCount}
            onSearchChange={setSearchInput}
            onCategoryChange={(value) => updateParams({ category: value })}
            onSortChange={(value) => updateParams({ sort: value })}
            onFilterChange={(key, value) =>
              updateParams({
                [key === "admissionStatus" ? "admission" : key]: value.trim(),
              })
            }
            onClearFilters={() => updateParams({ location: "", affiliation: "", admission: "" })}
          />
        </section>

        {directoryQuery.isPending ? (
          <DirectorySkeleton />
        ) : directoryQuery.isError ? (
          <div role="alert" className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-red-100 bg-red-50/60 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-red-600 shadow-sm">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-slate-900">The directory could not be loaded</h2>
            <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
              Please check your connection and try again. Your filters have been kept.
            </p>
            <Button
              onClick={() => directoryQuery.refetch()}
              className="mt-5 rounded-xl bg-[#0073e6] px-5 hover:bg-[#0062c4]"
            >
              Try again
            </Button>
          </div>
        ) : institutes.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-[#0073e6]">
              <Building2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-slate-900">No institutions match these filters</h2>
            <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
              Try another search, switch category, or clear the detailed filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchInput("");
                setSearchParams(new URLSearchParams(), { replace: true });
              }}
              className="mt-5 rounded-xl border-slate-200 text-[#0073e6] hover:bg-blue-50"
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {institutes.map((institute) => (
                <InstituteCard key={institute.id} institute={institute} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={directoryQuery.isFetching}
                  onClick={() => setLimit((current) => current + PAGE_SIZE)}
                  className="h-11 rounded-full border-slate-200 bg-white px-7 text-sm font-extrabold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-[#0073e6]"
                >
                  {directoryQuery.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Load more institutions
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PublicPageLayout>
  );
}
