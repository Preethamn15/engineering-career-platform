import type { Job } from "./types";

const ARTHA_BASE_URL =
  "https://api-india.artha.link/api/v1";

export class ArthaApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ArthaApiError";
    this.status = status;
  }
}

type ArthaJobsResponse = {
  success: boolean;
  message?: string;
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

export type JobsQuery = {
  limit?: number;
  offset?: number;
  location?: string;
  state?: string;
  city?: string;
  q?: string;
  categories?: string;
  job_type?: string;
  work_mode?: string;
  sort_by?: string;
};

export async function getArthaJobs(
  query: JobsQuery = {}
) {
  const apiKey = process.env.ARTHA_API_KEY;

  if (!apiKey) {
    throw new Error("ARTHA_API_KEY is not configured.");
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      params.set(key, String(value));
    }
  });

  const url = `${ARTHA_BASE_URL}/jobs?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const result =
    (await response.json()) as ArthaJobsResponse;

  if (!response.ok || !result.success) {
    throw new ArthaApiError(
      result.error?.message ||
        `Artha API request failed (${response.status})`,
      response.status
    );
  }

  return result;
}