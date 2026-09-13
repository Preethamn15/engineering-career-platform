"use client";

import {
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Filter,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Job } from "@/lib/types";
import { matchesExperienceFilters, type ExperienceFilter } from "@/lib/experience";

type FilterOption = { value: string; count?: number };
type Section = "all" | "saved" | "picks";
type JobsResponse = {
  success?: boolean;
  data?: { items?: Job[]; total?: number; has_more?: boolean };
  error?: { message?: string };
};
type FiltersResponse = { success?: boolean; data?: Record<string, unknown> };

const PAGE_SIZE = 100;
const STORAGE_SAVED = "artha-job-finder-saved";
const STORAGE_PICKS = "artha-job-finder-picks";
const experienceLabels: Record<ExperienceFilter, string> = {
  fresher: "Fresher / 0 Years",
  "0-1": "0–1 Years",
  "1-2": "1–2 Years",
  "2-3": "2–3 Years",
  "3-plus": "3+ Years",
};
const experienceOptions = Object.keys(experienceLabels) as ExperienceFilter[];

function getOptions(data: Record<string, unknown> | undefined, keys: string[]) {
  if (!data) return [];
  for (const key of keys) {
    const values = data[key];
    if (!Array.isArray(values)) continue;
    return values.map((item) => {
      if (typeof item === "string") return { value: item };
      if (item && typeof item === "object" && "value" in item) {
        const option = item as { value?: unknown; count?: unknown };
        return typeof option.value === "string"
          ? { value: option.value, count: typeof option.count === "number" ? option.count : undefined }
          : null;
      }
      return null;
    }).filter(Boolean) as FilterOption[];
  }
  return [];
}

function label(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isNew(value?: string | null) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && (Date.now() - time) / 86400000 <= 7;
}

function locationFor(job: Job) {
  return job.location || [job.city, job.state].filter(Boolean).join(", ") || job.country || "Location unavailable";
}

function experienceFor(job: Job) {
  if (typeof job.exp_min !== "number") return null;
  return typeof job.exp_max === "number" ? `${job.exp_min}–${job.exp_max} ${job.exp_unit || "years"}` : `${job.exp_min}+ ${job.exp_unit || "years"}`;
}

function salaryFor(job: Job) {
  if (typeof job.salary_min !== "number") return null;
  const currency = job.salary_curr ? `${job.salary_curr} ` : "";
  return typeof job.salary_max === "number" ? `${currency}${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()}` : `${currency}${job.salary_min.toLocaleString()}+`;
}

function plainDescription(value?: string | null) {
  return (value || "No description available.").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function initials(company?: string) {
  return company?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CO";
}

function MultiSelect({ title, options, selected, onToggle, onClear, loading, emphasis }: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  loading?: boolean;
  emphasis?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(event: MouseEvent) {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return <div ref={wrapper} className="relative min-w-[170px] flex-1 sm:flex-none">
    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[#7c6cf2]/30 ${selected.length ? "border-[#7c6cf2] bg-[#f6f4ff] text-[#4936c7]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"} ${emphasis && !selected.length ? "border-[#7c6cf2]/50" : ""}`}>
      <span className="truncate">{title}{selected.length ? ` · ${selected.length}` : ""}</span><ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
    </button>
    {open && <div className="absolute left-0 top-[calc(100%+8px)] z-30 max-h-72 min-w-[245px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</span>{selected.length > 0 && <button type="button" onClick={onClear} className="text-xs font-semibold text-[#5846d8] hover:underline">Clear</button>}</div>
      {loading && <div className="px-3 py-4 text-sm text-slate-400">Loading options...</div>}
      {!loading && options.length === 0 && <div className="px-3 py-4 text-sm text-slate-400">No options available</div>}
      {!loading && options.map((option) => { const optionLabel = experienceLabels[option.value as ExperienceFilter] || label(option.value); return <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"><input type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(option.value)} className="h-4 w-4 accent-[#5846d8]" /><span className="min-w-0 flex-1 truncate">{optionLabel}</span>{typeof option.count === "number" && <span className="text-xs text-slate-400">{option.count.toLocaleString()}</span>}</label>; })}
    </div>}
  </div>;
}

function FilterChip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#f0edff] px-2.5 py-1.5 text-xs font-semibold text-[#5140c5]"><span className="max-w-[180px] truncate">{text}</span><button type="button" aria-label={`Remove ${text}`} onClick={onRemove} className="rounded p-0.5 hover:bg-[#dcd6ff]"><X size={13} /></button></span>;
}

function Stat({ icon: Icon, label: statLabel, value, tone, loading }: { icon: typeof BriefcaseBusiness; label: string; value: number; tone: string; loading?: boolean }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5"><div className="flex items-center justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></span>{loading ? <span className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" /> : <span className="text-2xl font-bold tracking-tight text-slate-950">{value.toLocaleString()}</span>}</div><p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{statLabel}</p></div>;
}

function JobSkeleton() {
  return <div className="h-[350px] animate-pulse rounded-2xl border border-slate-200 bg-white p-6"><div className="flex gap-4"><div className="h-12 w-12 rounded-xl bg-slate-100" /><div className="flex-1 space-y-3"><div className="h-3 w-28 rounded bg-slate-100" /><div className="h-6 w-3/4 rounded bg-slate-100" /></div></div><div className="mt-7 h-8 rounded bg-slate-100" /><div className="mt-4 h-8 w-2/3 rounded bg-slate-100" /><div className="mt-7 h-4 w-1/2 rounded bg-slate-100" /><div className="mt-12 h-10 rounded bg-slate-100" /></div>;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceFilter[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [saved, setSaved] = useState<string[]>([]);
  const [contentPicks, setContentPicks] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterData, setFilterData] = useState<Record<string, unknown>>();
  const [filtersLoading, setFiltersLoading] = useState(true);

  const categories = useMemo(() => getOptions(filterData, ["categories", "category"]), [filterData]);
  const jobTypes = useMemo(() => getOptions(filterData, ["job_types", "jobTypes", "job_type"]), [filterData]);
  const workModes = useMemo(() => getOptions(filterData, ["work_modes", "workModes", "work_mode"]), [filterData]);
  const countries = useMemo(() => getOptions(filterData, ["countries", "locations"]), [filterData]);
  const states = useMemo(() => getOptions(filterData, ["states"]), [filterData]);
  const cities = useMemo(() => getOptions(filterData, ["cities"]), [filterData]);

  useEffect(() => {
    try {
      const storedSaved = localStorage.getItem(STORAGE_SAVED);
      const storedPicks = localStorage.getItem(STORAGE_PICKS);
      if (storedSaved) queueMicrotask(() => setSaved(JSON.parse(storedSaved)));
      if (storedPicks) queueMicrotask(() => setContentPicks(JSON.parse(storedPicks)));
    } catch { /* Ignore malformed browser storage. */ }
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_SAVED, JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem(STORAGE_PICKS, JSON.stringify(contentPicks)); }, [contentPicks]);

  const loadFilters = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const response = await fetch("/api/jobs/filters", { cache: "no-store" });
      const result = (await response.json()) as FiltersResponse;
      if (!response.ok || !result.success) throw new Error("Unable to load filter options.");
      setFilterData(result.data);
    } catch { setFilterData(undefined); } finally { setFiltersLoading(false); }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const jobTypeValues = selectedJobTypes.length ? selectedJobTypes : [""];
      const workModeValues = selectedWorkModes.length ? selectedWorkModes : [""];
      const requests = jobTypeValues.flatMap((jobType) => workModeValues.map((workMode) => {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE), sort_by: sortBy });
        if (appliedSearch) params.set("q", appliedSearch);
        if (selectedLocations.length) params.set("location", selectedLocations.join(","));
        if (selectedStates.length) params.set("state", selectedStates.join(","));
        if (selectedCities.length) params.set("city", selectedCities.join(","));
        if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
        if (jobType) params.set("job_type", jobType);
        if (workMode) params.set("work_mode", workMode);
        return fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
      }));
      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(async (response) => ({ response, result: (await response.json()) as JobsResponse })));
      const failed = results.find(({ response, result }) => !response.ok || !result.success);
      if (failed) {
        if (failed.response.status === 401 || failed.response.status === 403) throw new Error("The Artha API key is invalid or expired.");
        if (failed.response.status === 429) throw new Error("Artha is rate limiting requests. Please try again shortly.");
        throw new Error(failed.result.error?.message || "Unable to load jobs right now.");
      }
      const uniqueItems = new Map<string, Job>();
      results.forEach(({ result }) => (result.data?.items || []).forEach((job) => uniqueItems.set(job.id, job)));
      const apiTotal = results.reduce((sum, { result }) => sum + (result.data?.total || 0), 0);
      setJobs(Array.from(uniqueItems.values()));
      setTotal(apiTotal || uniqueItems.size);
      setHasMore(results.some(({ result }) => result.data?.has_more === true));
    } catch (requestError) {
      setJobs([]); setHasMore(false); setError(requestError instanceof Error ? requestError.message : "Unable to load jobs right now.");
    } finally { setLoading(false); }
  }, [appliedSearch, page, selectedCategories, selectedCities, selectedJobTypes, selectedLocations, selectedStates, selectedWorkModes, sortBy]);

  useEffect(() => { queueMicrotask(() => void loadFilters()); }, [loadFilters]);
  useEffect(() => { queueMicrotask(() => void loadJobs()); }, [loadJobs]);

  const refinedJobs = useMemo(() => jobs.filter((job) => matchesExperienceFilters(job, selectedExperience)), [jobs, selectedExperience]);
  const displayedJobs = useMemo(() => activeSection === "saved" ? refinedJobs.filter((job) => saved.includes(job.id)) : activeSection === "picks" ? refinedJobs.filter((job) => contentPicks.includes(job.id)) : refinedJobs, [activeSection, contentPicks, refinedJobs, saved]);
  const internshipCount = refinedJobs.filter((job) => job.job_type?.toLowerCase() === "internship").length;
  const remoteCount = refinedJobs.filter((job) => job.work_mode?.toLowerCase() === "remote").length;
  const selectedFilterCount = selectedLocations.length + selectedStates.length + selectedCities.length + selectedCategories.length + selectedJobTypes.length + selectedWorkModes.length + selectedExperience.length;
  const currentStart = jobs.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const currentEnd = jobs.length ? currentStart + jobs.length - 1 : 0;

  function resetToFirstPage() { setPage(1); setActiveSection("all"); }
  function toggleValue(setter: Dispatch<SetStateAction<string[]>>, value: string) { setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]); resetToFirstPage(); }
  function toggleExperience(value: ExperienceFilter) { setSelectedExperience((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]); resetToFirstPage(); }
  function clearAll() { setSearch(""); setAppliedSearch(""); setSelectedLocations([]); setSelectedStates([]); setSelectedCities([]); setSelectedCategories([]); setSelectedJobTypes([]); setSelectedWorkModes([]); setSelectedExperience([]); setSortBy("newest"); resetToFirstPage(); }
  function performSearch() { setAppliedSearch(search.trim()); resetToFirstPage(); }
  function toggleSaved(id: string) { setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function toggleContentPick(id: string) { setContentPicks((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }

  const activeChips = [
    ...selectedExperience.map((value) => ({ text: experienceLabels[value], remove: () => toggleExperience(value) })),
    ...selectedCategories.map((value) => ({ text: label(value), remove: () => toggleValue(setSelectedCategories, value) })),
    ...selectedJobTypes.map((value) => ({ text: label(value), remove: () => toggleValue(setSelectedJobTypes, value) })),
    ...selectedWorkModes.map((value) => ({ text: label(value), remove: () => toggleValue(setSelectedWorkModes, value) })),
    ...selectedLocations.map((value) => ({ text: label(value), remove: () => toggleValue(setSelectedLocations, value) })),
    ...selectedStates.map((value) => ({ text: label(value), remove: () => toggleValue(setSelectedStates, value) })),
    ...selectedCities.map((value) => ({ text: label(value), remove: () => toggleValue(setSelectedCities, value) })),
  ];

  return <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-4 md:px-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#181b2f] text-white shadow-sm"><BriefcaseBusiness size={19} /></div><div><p className="text-[15px] font-bold tracking-tight">Artha Job Finder</p><p className="text-xs text-slate-500">Live opportunity intelligence</p></div></div><button type="button" onClick={() => void loadJobs()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Refreshing" : "Refresh"}</button></div></header>
    <div className="mx-auto max-w-[1480px] px-5 py-8 md:px-8 md:py-10">
      <section className="relative overflow-hidden rounded-[26px] bg-[#181b2f] px-6 py-8 text-white shadow-xl shadow-[#181b2f]/10 md:px-10 md:py-10"><div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[42px] border-[#7467e8]/20" /><div className="relative max-w-3xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d9d5ff]"><Sparkles size={13} /> Live Artha opportunities</div><h1 className="max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">Find your next opportunity faster.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 md:text-base">Search live jobs, compare the details that matter, and build a shortlist in one focused workspace.</p><div className="mt-7 flex flex-col gap-2 sm:flex-row"><div className="flex min-w-0 flex-1 items-center rounded-2xl border border-white/15 bg-white px-4 text-slate-900 shadow-lg"><Search size={19} className="mr-3 shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") performSearch(); }} placeholder="Search titles, companies, skills..." className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none md:text-base" />{search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); setAppliedSearch(""); resetToFirstPage(); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>}</div><button type="button" onClick={performSearch} disabled={loading} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#7467e8] px-7 text-sm font-bold text-white transition hover:bg-[#8579ef] disabled:opacity-60"><Search size={17} />{loading && appliedSearch ? "Searching..." : "Search"}</button></div>{appliedSearch && <p className="mt-3 text-xs text-slate-300">Showing live results for <span className="font-semibold text-white">“{appliedSearch}”</span></p>}</div></section>
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"><Stat icon={BriefcaseBusiness} label="Total Jobs" value={total} tone="bg-[#eeecff] text-[#5846d8]" loading={loading} /><Stat icon={Zap} label="Current Results" value={displayedJobs.length} tone="bg-amber-50 text-amber-600" loading={loading} /><Stat icon={GraduationCap} label="Internships" value={internshipCount} tone="bg-emerald-50 text-emerald-600" loading={loading} /><Stat icon={MapPin} label="Remote Jobs" value={remoteCount} tone="bg-sky-50 text-sky-600" loading={loading} /><Stat icon={Bookmark} label="Saved Jobs" value={saved.length} tone="bg-rose-50 text-rose-500" /></section>
      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02] md:p-5"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShowFilters((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-[#181b2f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#272b45]"><SlidersHorizontal size={16} /> Filters{selectedFilterCount > 0 && <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-xs">{selectedFilterCount}</span>}</button><MultiSelect title="Experience" emphasis options={experienceOptions.map((value) => ({ value }))} selected={selectedExperience} onToggle={(value) => toggleExperience(value as ExperienceFilter)} onClear={() => { setSelectedExperience([]); resetToFirstPage(); }} /><MultiSelect title="Job Type" options={jobTypes} selected={selectedJobTypes} onToggle={(value) => toggleValue(setSelectedJobTypes, value)} onClear={() => { setSelectedJobTypes([]); resetToFirstPage(); }} loading={filtersLoading} /><MultiSelect title="Work Mode" options={workModes} selected={selectedWorkModes} onToggle={(value) => toggleValue(setSelectedWorkModes, value)} onClear={() => { setSelectedWorkModes([]); resetToFirstPage(); }} loading={filtersLoading} /><MultiSelect title="Category" options={categories} selected={selectedCategories} onToggle={(value) => toggleValue(setSelectedCategories, value)} onClear={() => { setSelectedCategories([]); resetToFirstPage(); }} loading={filtersLoading} /><MultiSelect title="Location" options={countries} selected={selectedLocations} onToggle={(value) => toggleValue(setSelectedLocations, value)} onClear={() => { setSelectedLocations([]); resetToFirstPage(); }} loading={filtersLoading} /><button type="button" onClick={clearAll} disabled={selectedFilterCount === 0 && !appliedSearch && sortBy === "newest"} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5846d8] transition hover:bg-[#f2f0ff] disabled:opacity-40">Clear all</button></div>{showFilters && <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 md:grid-cols-3"><MultiSelect title="State" options={states} selected={selectedStates} onToggle={(value) => toggleValue(setSelectedStates, value)} onClear={() => { setSelectedStates([]); resetToFirstPage(); }} loading={filtersLoading} /><MultiSelect title="City" options={cities} selected={selectedCities} onToggle={(value) => toggleValue(setSelectedCities, value)} onClear={() => { setSelectedCities([]); resetToFirstPage(); }} loading={filtersLoading} /><div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 text-xs text-slate-500"><Filter size={15} /> Experience filtering is applied to loaded Artha results.</div></div>}{activeChips.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><span className="mr-1 text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Active</span>{activeChips.map((chip, index) => <FilterChip key={`${chip.text}-${index}`} text={chip.text} onRemove={chip.remove} />)}</div>}</section>
      <div className="mt-8 flex items-center justify-between gap-4"><div className="flex gap-2 overflow-x-auto">{([["all", "All opportunities"], ["saved", "Saved jobs"], ["picks", "Content picks"]] as [Section, string][]).map(([value, text]) => <button type="button" key={value} onClick={() => setActiveSection(value)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeSection === value ? "bg-[#181b2f] text-white" : "text-slate-500 hover:bg-white hover:text-slate-800"}`}>{text}{value === "saved" && ` · ${saved.length}`}{value === "picks" && ` · ${contentPicks.length}`}</button>)}</div><div className="hidden items-center gap-2 sm:flex"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Sort</span><select value={sortBy} onChange={(event) => { setSortBy(event.target.value); resetToFirstPage(); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#7467e8]"><option value="most_relevant">Most Relevant</option><option value="newest">Newest</option><option value="high_cpa">Highest CPA</option></select></div></div>
      <section className="mt-5"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5846d8]">{activeSection === "all" ? "Live results" : activeSection === "saved" ? "Your shortlist" : "Your picks"}</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{activeSection === "all" ? "Latest opportunities" : activeSection === "saved" ? "Saved jobs" : "Content picks"}</h2></div><p className="text-sm text-slate-500">{currentStart && currentEnd ? `Showing ${currentStart}–${currentEnd} of ${total.toLocaleString()}` : `${displayedJobs.length} results`}</p></div>{loading && <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <JobSkeleton key={index} />)}</div>}{!loading && error && <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><CircleAlert className="mx-auto text-red-500" size={30} /><h3 className="mt-3 text-lg font-bold text-red-900">Unable to load jobs right now</h3><p className="mt-1 text-sm text-red-700">{error}</p><button type="button" onClick={() => void loadJobs()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"><RefreshCw size={15} /> Retry</button></div>}{!loading && !error && displayedJobs.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Search className="mx-auto text-slate-300" size={34} /><h3 className="mt-4 text-xl font-bold">{activeSection === "saved" ? "No saved jobs yet" : activeSection === "picks" ? "No content picks yet" : "No jobs found"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{activeSection === "all" ? "Try removing a filter or searching for a different keyword." : "Save opportunities from the results to build this list."}</p><button type="button" onClick={clearAll} className="mt-5 rounded-xl bg-[#5846d8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4936c7]">{activeSection === "all" ? "Clear filters" : "Browse opportunities"}</button></div>}{!loading && !error && displayedJobs.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{displayedJobs.map((job) => { const savedJob = saved.includes(job.id); const picked = contentPicks.includes(job.id); const experience = experienceFor(job); const salary = salaryFor(job); return <article key={job.id} className="group flex min-h-[350px] flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-[#c9c3ff] hover:shadow-lg hover:shadow-[#5145e5]/[0.08] sm:p-6"><div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-bold text-slate-500">{job.logo ? <img src={job.logo} alt={`${job.company} logo`} className="h-full w-full object-contain p-2" /> : initials(job.company)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-slate-500">{job.company || "Company unavailable"}</p>{isNew(job.posted_date) && <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">New</span>}</div><h3 className="mt-1 line-clamp-2 text-lg font-bold leading-6 tracking-tight text-slate-950">{job.title}</h3></div><button type="button" onClick={() => toggleSaved(job.id)} aria-label={savedJob ? "Remove saved job" : "Save job"} title={savedJob ? "Remove saved job" : "Save job"} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${savedJob ? "border-[#7467e8] bg-[#f0edff] text-[#5846d8]" : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700"}`}><Bookmark size={17} fill={savedJob ? "currentColor" : "none"} /></button></div><div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><MapPin size={14} className="text-slate-400" />{locationFor(job)}</span>{job.job_type && <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><BriefcaseBusiness size={14} className="text-slate-400" />{label(job.job_type)}</span>}{job.work_mode && <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><Building2 size={14} className="text-slate-400" />{label(job.work_mode)}</span>}</div><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4f2ff] px-2.5 py-2 text-[#5846d8]"><GraduationCap size={14} />{experience || "Experience not listed"}</span>{salary && <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-700"><Tag size={14} />{salary}</span>}</div>{job.skills && job.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{job.skills.slice(0, 6).map((skill) => <span key={skill} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">{skill}</span>)}</div>}<div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><p className="inline-flex items-center gap-1.5 text-xs text-slate-400"><Clock3 size={14} />{isNew(job.posted_date) ? "New · " : "Posted "}{formatDate(job.posted_date)}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setSelectedJob(job)} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Details</button><button type="button" onClick={() => toggleContentPick(job.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${picked ? "bg-amber-100 text-amber-800" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}><Check size={13} />{picked ? "Picked" : "Pick"}</button><a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#5846d8] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#4936c7]">View Job <ExternalLink size={13} /></a></div></div></article>; })}</div>}</section>
      {!loading && !error && activeSection === "all" && <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={16} /> Previous</button><div className="flex items-center gap-2"><span className="rounded-lg bg-[#f0edff] px-3 py-2 text-sm font-bold text-[#5846d8]">{page}</span><span className="text-sm text-slate-400">of {hasMore ? "…" : page}</span></div><button type="button" disabled={!hasMore} onClick={() => setPage((value) => value + 1)} className="inline-flex items-center gap-1 rounded-xl bg-[#181b2f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#272b45] disabled:cursor-not-allowed disabled:opacity-35">Next <ChevronRight size={16} /></button></div>}
    </div>
    {selectedJob && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm md:items-center md:p-6" onClick={() => setSelectedJob(null)}><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl md:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-5"><div className="flex min-w-0 gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-bold text-slate-500">{selectedJob.logo ? <img src={selectedJob.logo} alt="" className="h-full w-full object-contain p-2" /> : initials(selectedJob.company)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-500">{selectedJob.company}</p><h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{selectedJob.title}</h2></div></div><button type="button" aria-label="Close job details" onClick={() => setSelectedJob(null)} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X size={20} /></button></div><div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600"><span className="rounded-lg bg-slate-100 px-3 py-2"><MapPin size={14} className="mr-1 inline" />{locationFor(selectedJob)}</span>{selectedJob.job_type && <span className="rounded-lg bg-slate-100 px-3 py-2">{label(selectedJob.job_type)}</span>}{selectedJob.work_mode && <span className="rounded-lg bg-slate-100 px-3 py-2">{label(selectedJob.work_mode)}</span>}{experienceFor(selectedJob) && <span className="rounded-lg bg-[#f0edff] px-3 py-2 text-[#5846d8]">{experienceFor(selectedJob)}</span>}{salaryFor(selectedJob) && <span className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">{salaryFor(selectedJob)}</span>}</div>{selectedJob.skills && selectedJob.skills.length > 0 && <section className="mt-7"><h3 className="text-base font-bold">Skills</h3><div className="mt-3 flex flex-wrap gap-2">{selectedJob.skills.map((skill) => <span key={skill} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{skill}</span>)}</div></section>}<section className="mt-7"><div className="flex items-center justify-between gap-4"><h3 className="text-base font-bold">Job description</h3><span className="text-xs text-slate-400">Posted {formatDate(selectedJob.posted_date)}</span></div><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{plainDescription(selectedJob.description)}</p></section><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5846d8] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#4936c7]">View Job on Artha <ExternalLink size={16} /></a><button type="button" onClick={() => toggleSaved(selectedJob.id)} className="rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">{saved.includes(selectedJob.id) ? "Saved" : "Save job"}</button></div></div></div>}
  </main>;
}