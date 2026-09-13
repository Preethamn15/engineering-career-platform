"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Job } from "@/lib/types";
import {
  matchesExperienceFilters,
  type ExperienceFilter,
} from "@/lib/experience";

type FilterOption = {
  value: string;
  count?: number;
};

type FiltersResponse = {
  success?: boolean;
  data?: Record<string, unknown>;
};

type JobsResponse = {
  success?: boolean;
  data?: {
    items?: Job[];
    total?: number;
    limit?: number;
    offset?: number;
    has_more?: boolean;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

const STORAGE_SAVED = "artha-job-finder-saved";
const STORAGE_PICKS = "artha-job-finder-picks";

function getOptions(
  data: Record<string, unknown> | undefined,
  keys: string[]
): FilterOption[] {
  if (!data) return [];

  for (const key of keys) {
    const value = data[key];

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") {
            return { value: item };
          }

          if (
            item &&
            typeof item === "object" &&
            "value" in item
          ) {
            const obj = item as {
              value?: unknown;
              count?: unknown;
            };

            if (typeof obj.value === "string") {
              return {
                value: obj.value,
                count:
                  typeof obj.count === "number"
                    ? obj.count
                    : undefined,
              };
            }
          }

          return null;
        })
        .filter(Boolean) as FilterOption[];
    }
  }

  return [];
}

function formatLabel(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date?: string | null) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isFresh(date?: string | null) {
  if (!date) return false;

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return false;

  const days =
    (Date.now() - parsed.getTime()) /
    (1000 * 60 * 60 * 24);

  return days <= 7;
}

function stripHtml(html?: string | null) {
  if (!html) return "No description available.";

  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getLocation(job: Job) {
  return (
    job.location ||
    [job.city, job.state]
      .filter(Boolean)
      .join(", ") ||
    job.country ||
    "Location unavailable"
  );
}

function getExperience(job: Job) {
  if (
    job.exp_min === null ||
    job.exp_min === undefined
  ) {
    return null;
  }

  const unit = job.exp_unit || "years";

  if (
    job.exp_max !== null &&
    job.exp_max !== undefined
  ) {
    return `${job.exp_min}–${job.exp_max} ${unit}`;
  }

  return `${job.exp_min}+ ${unit}`;
}

function getSalary(job: Job) {
  if (
    job.salary_min === null ||
    job.salary_min === undefined
  ) {
    return null;
  }

  const currency = job.salary_curr || "";

  if (
    job.salary_max !== null &&
    job.salary_max !== undefined
  ) {
    return `${currency} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`;
  }

  return `${currency} ${job.salary_min.toLocaleString()}+`;
}

function getExperienceFilterLabel(filter: ExperienceFilter) {
  return {
    fresher: "Fresher / 0 Years",
    "0-1": "0–1 Years",
    "1-2": "1–2 Years",
    "2-3": "2–3 Years",
    "3-plus": "3+ Years",
  }[filter];
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [jobType, setJobType] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [selectedExperience, setSelectedExperience] =
    useState<ExperienceFilter[]>([]);
  const [showExperienceOptions, setShowExperienceOptions] =
    useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const [saved, setSaved] = useState<string[]>([]);
  const [contentPicks, setContentPicks] = useState<string[]>([]);

  const [activeSection, setActiveSection] =
    useState<"all" | "saved" | "picks">("all");

  const [selectedJob, setSelectedJob] =
    useState<Job | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const [filterData, setFilterData] =
    useState<Record<string, unknown>>();

  const [filtersLoading, setFiltersLoading] =
    useState(true);
  const [filtersError, setFiltersError] =
    useState("");

  useEffect(() => {
    try {
      const savedJobs = localStorage.getItem(
        STORAGE_SAVED
      );

      const picks = localStorage.getItem(
        STORAGE_PICKS
      );

      if (savedJobs) {
        queueMicrotask(() => setSaved(JSON.parse(savedJobs)));
      }

      if (picks) {
        queueMicrotask(() =>
          setContentPicks(JSON.parse(picks))
        );
      }
    } catch {
      // Ignore invalid localStorage data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_SAVED,
      JSON.stringify(saved)
    );
  }, [saved]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_PICKS,
      JSON.stringify(contentPicks)
    );
  }, [contentPicks]);

  const categories = useMemo(
    () =>
      getOptions(filterData, [
        "categories",
        "category",
      ]),
    [filterData]
  );

  const jobTypes = useMemo(
    () =>
      getOptions(filterData, [
        "job_types",
        "jobTypes",
        "job_type",
      ]),
    [filterData]
  );

  const workModes = useMemo(
    () =>
      getOptions(filterData, [
        "work_modes",
        "workModes",
        "work_mode",
      ]),
    [filterData]
  );

  const countries = useMemo(
    () =>
      getOptions(filterData, [
        "countries",
        "locations",
      ]),
    [filterData]
  );

  const states = useMemo(
    () =>
      getOptions(filterData, ["states"]),
    [filterData]
  );

  const cities = useMemo(
    () =>
      getOptions(filterData, ["cities"]),
    [filterData]
  );

  const loadFilters = useCallback(async () => {
    try {
      setFiltersLoading(true);
      setFiltersError("");

      const response = await fetch(
        "/api/jobs/filters",
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as FiltersResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          "Unable to load filter options."
        );
      }

      setFilterData(result.data);
    } catch {
      setFilterData(undefined);
      setFiltersError(
        "Filter options are temporarily unavailable."
      );
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("limit", "100");
      params.set("offset", String((page - 1) * 100));

      if (appliedSearch) {
        params.set("q", appliedSearch);
      }

      if (location) {
        params.set("location", location);
      }

      if (state) {
        params.set("state", state);
      }

      if (city) {
        params.set("city", city);
      }

      if (category) {
        params.set("categories", category);
      }

      if (jobType) {
        params.set("job_type", jobType);
      }

      if (workMode) {
        params.set("work_mode", workMode);
      }

      params.set("sort_by", sortBy);

      const response = await fetch(
        `/api/jobs?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result = (await response.json()) as JobsResponse;

      if (!response.ok || !result.success) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "The Artha API key is invalid or expired. Please check the server configuration."
          );
        }

        if (response.status === 429) {
          throw new Error(
            "Artha is rate limiting requests. Please wait a moment and try again."
          );
        }

        throw new Error(
          result?.error?.message ||
            "Unable to fetch jobs."
        );
      }

      const items = Array.isArray(
        result?.data?.items
      )
        ? result.data.items
        : [];

      setJobs(items);
      setTotal(
        typeof result?.data?.total === "number"
          ? result.data.total
          : items.length
      );
      setHasMore(result?.data?.has_more === true);
    } catch (err) {
      setJobs([]);
      setHasMore(false);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading jobs."
      );
    } finally {
      setLoading(false);
    }
  }, [
    appliedSearch,
    category,
    city,
    jobType,
    location,
    page,
    sortBy,
    state,
    workMode,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadFilters());
  }, [loadFilters]);

  useEffect(() => {
    queueMicrotask(() => void loadJobs());
  }, [
    loadJobs,
  ]);

  function performSearch() {
    setAppliedSearch(search.trim());
    setPage(1);
    setActiveSection("all");
  }

  function clearFilters() {
    setSearch("");
    setAppliedSearch("");
    setLocation("");
    setState("");
    setCity("");
    setCategory("");
    setJobType("");
    setWorkMode("");
    setSelectedExperience([]);
    setSortBy("newest");
    setPage(1);
    setActiveSection("all");
  }

  function toggleSaved(id: string) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleContentPick(id: string) {
    setContentPicks((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  const experienceFilteredJobs = useMemo(
    () =>
      jobs.filter((job) =>
        matchesExperienceFilters(job, selectedExperience)
      ),
    [jobs, selectedExperience]
  );

  const displayedJobs = useMemo(() => {
    if (activeSection === "saved") {
      return experienceFilteredJobs.filter((job) =>
        saved.includes(job.id)
      );
    }

    if (activeSection === "picks") {
      return experienceFilteredJobs.filter((job) =>
        contentPicks.includes(job.id)
      );
    }

    return experienceFilteredJobs;
  }, [
    experienceFilteredJobs,
    activeSection,
    saved,
    contentPicks,
  ]);

  const internshipCount = experienceFilteredJobs.filter(
    (job) =>
      job.job_type?.toLowerCase() ===
      "internship"
  ).length;

  const remoteCount = experienceFilteredJobs.filter(
    (job) =>
      job.work_mode?.toLowerCase() === "remote"
  ).length;

  function selectFilter<T extends string>(
    setter: (value: T) => void,
    value: T
  ) {
    setter(value);
    setPage(1);
    setActiveSection("all");
  }

  function toggleExperienceFilter(filter: ExperienceFilter) {
    setSelectedExperience((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    );
    setPage(1);
    setActiveSection("all");
  }

  const experienceOptions: ExperienceFilter[] = [
    "fresher",
    "0-1",
    "1-2",
    "2-3",
    "3-plus",
  ];

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#111827]">
      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 md:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-xl text-white shadow-sm">
                💼
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Artha Job Finder
                </h1>

                <p className="text-sm text-gray-500">
                  Find better opportunities, faster.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadJobs}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            ↻ {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
        {/* HERO */}
        <section className="mb-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-[#5145e5]">
            Job Discovery Dashboard
          </p>

          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Find your next opportunity.
          </h2>

          <p className="mt-3 max-w-2xl text-base text-gray-500 md:text-lg">
            Search, filter and shortlist opportunities
            from Artha in one simple workspace.
          </p>

          {/* SEARCH */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center rounded-2xl border border-gray-200 bg-white px-5 shadow-sm transition focus-within:border-[#5145e5] focus-within:ring-4 focus-within:ring-[#5145e5]/10">
              <span className="mr-3 text-xl text-gray-400">
                ⌕
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    performSearch();
                  }
                }}
                placeholder="Search jobs, companies, skills..."
                className="h-14 w-full bg-transparent text-base outline-none"
              />
            </div>

            <button
              onClick={performSearch}
              className="rounded-2xl bg-[#5145e5] px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4338ca]"
            >
              Search
            </button>
          </div>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Total Jobs", total],
            ["Current Results", displayedJobs.length],
            ["Internships", internshipCount],
            ["Remote Jobs", remoteCount],
            ["Saved Jobs", saved.length],
            ["Content Picks", contentPicks.length],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">
                {label}
              </p>

              <p className="mt-2 text-2xl font-bold">
                {value}
              </p>
            </div>
          ))}
        </section>

        {/* FILTER BAR */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setShowFilters((current) => !current)
              }
              className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
            >
              ⚙ Filters
            </button>

            <select
              value={location}
              onChange={(e) =>
                selectFilter(setLocation, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">
                All Locations
              </option>

              {countries.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {formatLabel(option.value)}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) =>
                selectFilter(setCategory, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">
                All Categories
              </option>

              {categories.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {formatLabel(option.value)}
                </option>
              ))}
            </select>

            <select
              value={jobType}
              onChange={(e) =>
                selectFilter(setJobType, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">
                All Job Types
              </option>

              {jobTypes.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {formatLabel(option.value)}
                </option>
              ))}
            </select>

            <select
              value={workMode}
              onChange={(e) =>
                selectFilter(setWorkMode, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">
                All Work Modes
              </option>

              {workModes.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {formatLabel(option.value)}
                </option>
              ))}
            </select>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowExperienceOptions((current) => !current)
                }
                aria-expanded={showExperienceOptions}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition hover:border-gray-300"
              >
                {selectedExperience.length === 0
                  ? "All Experience"
                  : `Experience · ${selectedExperience.length}`}
              </button>

              {showExperienceOptions && (
                <div className="absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  {experienceOptions.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExperience.includes(option)}
                        onChange={() =>
                          toggleExperienceFilter(option)
                        }
                        className="h-4 w-4 accent-[#5145e5]"
                      />
                      {getExperienceFilterLabel(option)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) =>
                selectFilter(setSortBy, e.target.value)
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="newest">
                Newest
              </option>

              <option value="most_relevant">
                Most Relevant
              </option>

              <option value="high_cpa">
                High CPA
              </option>
            </select>

            <button
              onClick={clearFilters}
              className="ml-auto rounded-xl px-4 py-3 text-sm font-semibold text-[#5145e5] hover:bg-[#5145e5]/5"
            >
              Clear All
            </button>
          </div>

          {selectedExperience.length > 0 && (
            <div className="mt-3 rounded-xl bg-[#5145e5]/5 px-4 py-3 text-sm text-[#5145e5]">
              Experience: {selectedExperience
                .map(getExperienceFilterLabel)
                .join(", ")}
              <span className="ml-1 text-[#5145e5]/70">
                · applied to the loaded Artha results
              </span>
            </div>
          )}

          {/* ADVANCED FILTERS */}
          {showFilters && (
            <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-3">
              <select
                value={state}
                onChange={(e) =>
                  selectFilter(setState, e.target.value)
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">
                  All States
                </option>

                {states.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {formatLabel(option.value)}
                  </option>
                ))}
              </select>

              <select
                value={city}
                onChange={(e) =>
                  selectFilter(setCity, e.target.value)
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">
                  All Cities
                </option>

                {cities.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {formatLabel(option.value)}
                  </option>
                ))}
              </select>

              <div className="flex items-center rounded-xl bg-gray-50 px-4 text-sm text-gray-500">
                {filtersLoading
                  ? "Loading Artha filters..."
                  : filtersError ||
                    "Filter options loaded from Artha"}
              </div>
            </div>
          )}
        </section>

        {/* NAVIGATION */}
        <div className="mt-8 flex gap-2 overflow-x-auto">
          {[
            ["all", "Latest Opportunities"],
            ["saved", "Saved Jobs"],
            ["picks", "Content Picks"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() =>
                setActiveSection(
                  value as "all" | "saved" | "picks"
                )
              }
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold transition ${
                activeSection === value
                  ? "bg-[#111827] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {label}
              {value === "saved" &&
                ` · ${saved.length}`}
              {value === "picks" &&
                ` · ${contentPicks.length}`}
            </button>
          ))}
        </div>

        {/* JOBS */}
        <section className="mt-6">
          <div className="mb-5">
            <h3 className="text-2xl font-bold">
              {activeSection === "all"
                ? "Latest opportunities"
                : activeSection === "saved"
                ? "Saved Jobs"
                : "Content Picks"}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {displayedJobs.length} opportunities shown
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h3 className="font-bold text-red-700">
                Couldn&apos;t load jobs
              </h3>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>

              <button
                onClick={loadJobs}
                className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading && !error && (
            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 6 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-[290px] animate-pulse rounded-3xl border border-gray-200 bg-white"
                  />
                )
              )}
            </div>
          )}

          {/* EMPTY */}
          {!loading &&
            !error &&
            displayedJobs.length === 0 && (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <div className="text-4xl">⌕</div>

                <h3 className="mt-4 text-xl font-bold">
                  No jobs found
                </h3>

                <p className="mt-2 text-gray-500">
                  Try changing your search or filters.
                </p>

                <button
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-[#5145e5] px-5 py-3 text-sm font-semibold text-white"
                >
                  Clear Filters
                </button>
              </div>
            )}

          {/* JOB GRID */}
          {!loading &&
            !error &&
            displayedJobs.length > 0 && (
              <div className="grid gap-5 lg:grid-cols-2">
                {displayedJobs.map((job) => {
                  const isSaved = saved.includes(
                    job.id
                  );

                  const isPick =
                    contentPicks.includes(job.id);

                  const experience =
                    getExperience(job);

                  const salary = getSalary(job);

                  return (
                    <article
                      key={job.id}
                      className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex gap-4">
                        {/* LOGO */}
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                          {job.logo ? (
                            <img
                              src={job.logo}
                              alt={`${job.company} logo`}
                              className="h-full w-full object-contain p-2"
                              onError={(e) => {
                                e.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-500">
                              {job.company
                                ?.slice(0, 2)
                                .toUpperCase() ||
                                "CO"}
                            </div>
                          )}
                        </div>

                        {/* TITLE */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-500">
                            {job.company ||
                              "Company unavailable"}
                          </p>

                          <h3 className="mt-1 line-clamp-2 text-xl font-bold tracking-tight">
                            {job.title}
                          </h3>
                        </div>

                        {/* SAVE */}
                        <button
                          onClick={() =>
                            toggleSaved(job.id)
                          }
                          className={`h-10 w-10 shrink-0 rounded-xl border text-lg transition ${
                            isSaved
                              ? "border-[#5145e5] bg-[#5145e5]/10 text-[#5145e5]"
                              : "border-gray-200 text-gray-400 hover:text-gray-700"
                          }`}
                          title={
                            isSaved
                              ? "Remove saved job"
                              : "Save job"
                          }
                        >
                          {isSaved ? "★" : "☆"}
                        </button>
                      </div>

                      {/* META */}
                      <div className="mt-5 flex flex-wrap gap-2 text-sm text-gray-600">
                        <span className="rounded-lg bg-gray-50 px-3 py-1.5">
                          📍 {getLocation(job)}
                        </span>

                        {job.work_mode && (
                          <span className="rounded-lg bg-gray-50 px-3 py-1.5">
                            {formatLabel(
                              job.work_mode
                            )}
                          </span>
                        )}

                        {job.job_type && (
                          <span className="rounded-lg bg-gray-50 px-3 py-1.5">
                            {formatLabel(
                              job.job_type
                            )}
                          </span>
                        )}
                      </div>

                      {/* EXPERIENCE + SALARY */}
                      {(experience || salary) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {experience && (
                            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
                              {experience}
                            </span>
                          )}

                          {salary && (
                            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                              {salary}
                            </span>
                          )}
                        </div>
                      )}

                      {/* SKILLS */}
                      {job.skills &&
                        job.skills.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {job.skills
                              .slice(0, 6)
                              .map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600"
                                >
                                  {skill}
                                </span>
                              ))}
                          </div>
                        )}

                      <div className="mt-5 border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-gray-400">
                            {isFresh(
                              job.posted_date
                            )
                              ? "Fresh · "
                              : "Posted "}
                            {formatDate(
                              job.posted_date
                            )}
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                toggleContentPick(
                                  job.id
                                )
                              }
                              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                isPick
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {isPick
                                ? "✓ Content Pick"
                                : "✦ Content Pick"}
                            </button>

                            <button
                              onClick={() =>
                                setSelectedJob(job)
                              }
                              className="rounded-xl bg-[#5145e5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

          {!loading && !error && activeSection === "all" && (
            <div className="mt-7 flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <button
                onClick={() => setPage((current) => current - 1)}
                disabled={page === 1}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm font-medium text-gray-500">
                Page {page}
              </span>

              <button
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasMore}
                className="rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>

      {/* DETAILS MODAL */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl md:rounded-3xl md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-5">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
                  {selectedJob.logo ? (
                    <img
                      src={selectedJob.logo}
                      alt=""
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="font-bold text-gray-500">
                      {selectedJob.company
                        ?.slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {selectedJob.company}
                  </p>

                  <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                    {selectedJob.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={() =>
                  setSelectedJob(null)
                }
                className="rounded-xl bg-gray-100 px-3 py-2 text-xl text-gray-500 hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-xl bg-gray-100 px-3 py-2 text-sm">
                📍 {getLocation(selectedJob)}
              </span>

              {selectedJob.work_mode && (
                <span className="rounded-xl bg-gray-100 px-3 py-2 text-sm">
                  {formatLabel(
                    selectedJob.work_mode
                  )}
                </span>
              )}

              {selectedJob.job_type && (
                <span className="rounded-xl bg-gray-100 px-3 py-2 text-sm">
                  {formatLabel(
                    selectedJob.job_type
                  )}
                </span>
              )}

              {getExperience(selectedJob) && (
                <span className="rounded-xl bg-gray-100 px-3 py-2 text-sm">
                  {getExperience(selectedJob)}
                </span>
              )}

              {getSalary(selectedJob) && (
                <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {getSalary(selectedJob)}
                </span>
              )}
            </div>

            {selectedJob.skills &&
              selectedJob.skills.length > 0 && (
                <section className="mt-7">
                  <h3 className="text-lg font-bold">
                    Skills
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedJob.skills.map(
                      (skill) => (
                        <span
                          key={skill}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </section>
              )}

            <section className="mt-7">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  Job Description
                </h3>

                <p className="text-sm text-gray-400">
                  Posted{" "}
                  {formatDate(
                    selectedJob.posted_date
                  )}
                </p>
              </div>

              <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-gray-600">
                {stripHtml(
                  selectedJob.description
                )}
              </p>
            </section>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center rounded-2xl bg-[#5145e5] px-6 py-4 font-bold text-white shadow-sm transition hover:bg-[#4338ca]"
              >
                Apply on Artha ↗
              </a>

              <button
                onClick={() =>
                  toggleSaved(selectedJob.id)
                }
                className="rounded-2xl border border-gray-200 bg-white px-6 py-4 font-bold text-gray-700 hover:bg-gray-50"
              >
                {saved.includes(selectedJob.id)
                  ? "★ Saved"
                  : "☆ Save Job"}
              </button>

              <button
                onClick={() =>
                  toggleContentPick(
                    selectedJob.id
                  )
                }
                className="rounded-2xl border border-gray-200 bg-white px-6 py-4 font-bold text-gray-700 hover:bg-gray-50"
              >
                {contentPicks.includes(
                  selectedJob.id
                )
                  ? "✓ Content Picked"
                  : "✦ Content Pick"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}