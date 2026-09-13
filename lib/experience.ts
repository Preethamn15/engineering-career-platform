import type { Job } from "./types";

export type ExperienceFilter =
  | "fresher"
  | "0-1"
  | "1-2"
  | "2-3"
  | "3-plus";

function getExperienceYears(job: Job) {
  if (
    typeof job.exp_min !== "number" ||
    !Number.isFinite(job.exp_min)
  ) {
    return null;
  }

  const unit = job.exp_unit?.toLowerCase() || "years";
  const divisor = unit.includes("month") ? 12 : 1;
  const min = job.exp_min / divisor;
  const max =
    typeof job.exp_max === "number" &&
    Number.isFinite(job.exp_max)
      ? job.exp_max / divisor
      : min;

  if (min < 0 || max < min) return null;

  return { min, max };
}

export function matchesExperienceFilter(
  job: Job,
  filter: ExperienceFilter
) {
  const experience = getExperienceYears(job);

  if (!experience) return false;

  if (filter === "fresher") {
    return experience.min === 0;
  }

  if (filter === "3-plus") {
    return experience.max >= 3;
  }

  const ranges: Record<
    Exclude<
      ExperienceFilter,
      "all" | "fresher" | "3-plus"
    >,
    [number, number]
  > = {
    "0-1": [0, 1],
    "1-2": [1, 2],
    "2-3": [2, 3],
  };
  const [rangeMin, rangeMax] = ranges[filter];

  return (
    experience.min <= rangeMax &&
    experience.max >= rangeMin
  );
}

export function matchesExperienceFilters(
  job: Job,
  filters: readonly ExperienceFilter[]
) {
  return (
    filters.length === 0 ||
    filters.some((filter) =>
      matchesExperienceFilter(job, filter)
    )
  );
}