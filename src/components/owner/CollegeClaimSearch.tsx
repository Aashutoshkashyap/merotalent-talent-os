import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface ClaimCollegeOption {
  id: string;
  name: string;
  location: string | null;
  institution_category: string | null;
}

interface CollegeClaimSearchProps {
  value: string;
  selected: ClaimCollegeOption | null;
  onChange: (value: string) => void;
  onSelect: (college: ClaimCollegeOption) => void;
  disabled?: boolean;
}

export function CollegeClaimSearch({ value, selected, onChange, onSelect, disabled }: CollegeClaimSearchProps) {
  const [matches, setMatches] = useState<ClaimCollegeOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchTerm = value.trim();

  useEffect(() => {
    if (selected || searchTerm.length < 2) return;

    let current = true;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ name: searchTerm, sort: "name", limit: "8" });
        const response = await fetch(`/api/v1/institutes/directory?${params}`);
        if (!response.ok) throw new Error("College search is unavailable.");
        const payload = await response.json() as { data: ClaimCollegeOption[] };
        if (current) { setMatches(payload.data); setError(false); }
      } catch {
        if (current) { setMatches([]); setError(true); }
      } finally {
        if (current) { setIsLoading(false); setActiveIndex(-1); }
      }
    }, 250);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [searchTerm, selected]);

  const choose = (college: ClaimCollegeOption) => {
    onSelect(college);
    setMatches([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const showSuggestions = isOpen && !selected && searchTerm.length >= 2;

  return (
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
    }}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="claim-college-search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? "claim-college-options" : undefined}
          aria-activedescendant={showSuggestions && activeIndex >= 0 ? `claim-college-option-${activeIndex}` : undefined}
          placeholder="Type at least 2 letters of the college name"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setMatches([]);
            setError(false);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (!showSuggestions) return;
            if (event.key === "ArrowDown" && matches.length) {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % matches.length);
            } else if (event.key === "ArrowUp" && matches.length) {
              event.preventDefault();
              setActiveIndex((index) => index <= 0 ? matches.length - 1 : index - 1);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (activeIndex >= 0 && matches[activeIndex]) choose(matches[activeIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="h-10 rounded-xl pl-9 text-sm"
          disabled={disabled}
          required
        />
        {isLoading && <Loader2 aria-label="Searching colleges" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />}
      </div>
      {selected && <p className="mt-1 text-xs text-emerald-700">Selected: {selected.name}{selected.location ? ` · ${selected.location}` : ""}</p>}
      {showSuggestions && (
        <div id="claim-college-options" role="listbox" aria-label="Matching colleges" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {matches.map((college, index) => (
            <button
              key={college.id}
              id={`claim-college-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(college)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${index === activeIndex ? "bg-slate-100" : ""}`}
            >
              <span className="block font-semibold text-slate-900">{college.name}</span>
              <span className="block text-xs text-slate-500">{[college.location, college.institution_category?.replaceAll("_", " ")].filter(Boolean).join(" · ") || "College"}</span>
            </button>
          ))}
          {isLoading && <p className="px-3 py-2 text-xs text-slate-500">Searching colleges…</p>}
          {!isLoading && error && <p className="px-3 py-2 text-xs text-red-600">Could not load colleges. Please try typing again.</p>}
          {!isLoading && !error && !matches.length && <p className="px-3 py-2 text-xs text-slate-500">No matching college. Use “List New College” if it is not in the directory.</p>}
        </div>
      )}
    </div>
  );
}
