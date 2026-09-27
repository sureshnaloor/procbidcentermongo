"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";

export interface SectionFilterState {
  search: string;
  month: string; // "01".."12" or ""
  year: string; // "2026" or ""
  status: string;
  type: string;
  counterpart: string;
}

export function emptySectionFilters(): SectionFilterState {
  return { search: "", month: "", year: "", status: "", type: "", counterpart: "" };
}

/**
 * Filter state persisted in localStorage under `key` (per page/section/user).
 * Loads the saved value on mount (and when the key changes), writes on every change.
 */
export function usePersistentFilters(key: string) {
  const [state, setStateRaw] = useState<SectionFilterState>(emptySectionFilters());
  const keyRef = useRef(key);
  useEffect(() => { keyRef.current = key; }, [key]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setStateRaw({ ...emptySectionFilters(), ...parsed });
        }
      }
    } catch { /* corrupted storage — start fresh */ }
  }, [key]);

  const setState = (next: SectionFilterState) => {
    setStateRaw(next);
    try { window.localStorage.setItem(keyRef.current, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  return [state, setState] as const;
}

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

/** True when the date matches the selected month/year (empty = no constraint). */
export function matchesDateFilters(
  dateRaw: string | Date | null | undefined,
  f: { month: string; year: string }
): boolean {
  if (!f.month && !f.year) return true;
  if (!dateRaw) return false;
  const d = new Date(dateRaw);
  if (Number.isNaN(d.getTime())) return false;
  if (f.year && String(d.getFullYear()) !== f.year) return false;
  if (f.month && String(d.getMonth() + 1).padStart(2, "0") !== f.month) return false;
  return true;
}

/** Case-insensitive match of the query against any of the given texts. */
export function matchesSearch(texts: (string | null | undefined)[], q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return texts.some((t) => (t ?? "").toLowerCase().includes(query));
}

/** Sorted (desc) list of years present in the given dates, always including the current year. */
export function yearsFrom(dates: (string | Date | null | undefined)[]): string[] {
  const ys = new Set<string>([String(new Date().getFullYear())]);
  for (const d of dates) {
    if (!d) continue;
    const dt = new Date(d);
    if (!Number.isNaN(dt.getTime())) ys.add(String(dt.getFullYear()));
  }
  return [...ys].sort().reverse();
}

export function SectionFilterBar({
  value,
  onChange,
  years,
  showSearch = true,
  searchPlaceholder = "Search…",
  statusOptions,
  showType = false,
  counterpartLabel,
  counterpartPlural,
  counterpartOptions,
  idPrefix,
}: {
  value: SectionFilterState;
  onChange: (next: SectionFilterState) => void;
  years: string[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** e.g. [{ value: "awarded", label: "Awarded" }] — omit to hide the status dropdown */
  statusOptions?: { value: string; label: string }[];
  showType?: boolean;
  counterpartLabel?: string;
  counterpartPlural?: string;
  counterpartOptions?: string[];
  idPrefix: string;
}) {
  const set = (patch: Partial<SectionFilterState>) => onChange({ ...value, ...patch });
  const hasActive = Boolean(value.search || value.month || value.year || value.status || value.type || value.counterpart);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2">
      {showSearch && (
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs rounded-lg bg-background/60"
            id={`${idPrefix}-search`}
          />
        </div>
      )}
      {statusOptions && statusOptions.length > 0 && (
        <Select value={value.status || "all"} onValueChange={(v) => set({ status: v === "all" ? "" : v })}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg bg-background/60" id={`${idPrefix}-status`}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showType && (
        <Select value={value.type || "all"} onValueChange={(v) => set({ type: v === "all" ? "" : v })}>
          <SelectTrigger className="w-[110px] h-8 text-xs rounded-lg bg-background/60" id={`${idPrefix}-type`}>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="rfq">RFQ</SelectItem>
            <SelectItem value="rfp">RFP</SelectItem>
            <SelectItem value="tender">Tender</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Select value={value.month || "all"} onValueChange={(v) => set({ month: v === "all" ? "" : v })}>
        <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg bg-background/60" id={`${idPrefix}-month`}>
          <SelectValue placeholder="All months" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All months</SelectItem>
          {MONTH_OPTIONS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.year || "all"} onValueChange={(v) => set({ year: v === "all" ? "" : v })}>
        <SelectTrigger className="w-[96px] h-8 text-xs rounded-lg bg-background/60" id={`${idPrefix}-year`}>
          <SelectValue placeholder="All years" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All years</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {counterpartLabel && counterpartOptions && counterpartOptions.length > 0 && (
        <Select value={value.counterpart || "all"} onValueChange={(v) => set({ counterpart: v === "all" ? "" : v })}>
          <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg bg-background/60" id={`${idPrefix}-counterpart`}>
            <SelectValue placeholder={`All ${counterpartPlural ?? `${counterpartLabel}s`}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {counterpartPlural ?? `${counterpartLabel}s`}</SelectItem>
            {counterpartOptions.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hasActive && (
        <button
          type="button"
          onClick={() => onChange(emptySectionFilters())}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          id={`${idPrefix}-clear`}
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
