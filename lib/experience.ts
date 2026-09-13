import type { Job } from "./types";

export type ExperienceFilter =
  | "fresher"
  | "0-1"
  | "1-2"
  | "2-3"
  | "3-plus";

function experienceRange(job: Job) {
  if (typeof job.exp_min !== "number" || !Number.isFinite(job.exp_min)) {
    return null;
  }

  const divisor = job.exp_unit?.toLowerCase().includes("month") ? 12 : 1;
  const min = job.exp_min / divisor;
  const max = typeof job.exp_max === "number" && Number.isFinite(job.exp_max)
    ? job.exp_max / divisor
    : min;

  return min >= 0 && max >= min ? { min, max } : null;
}

export function matchesExperienceFilter(job: Job, filter: ExperienceFilter) {
  const range = experienceRange(job);
  if (!range) return false;
  if (filter === "fresher") return range.min === 0;
  if (filter === "3-plus") return range.max >= 3;

  const bounds: Record<Exclude<ExperienceFilter, "fresher" | "3-plus">, [number, number]> = {
    "0-1": [0, 1],
    "1-2": [1, 2],
    "2-3": [2, 3],
  };
  const [min, max] = bounds[filter];
  return range.min <= max && range.max >= min;
}

export function matchesExperienceFilters(job: Job, filters: readonly ExperienceFilter[]) {
  return filters.length === 0 || filters.some((filter) => matchesExperienceFilter(job, filter));
}