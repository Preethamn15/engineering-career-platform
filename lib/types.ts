export interface Job {
  id: string;
  slug?: string;
  title: string;
  company: string;
  logo?: string | null;
  description?: string | null;

  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;

  job_type?: string | null;
  work_mode?: string | null;

  salary_min?: number | null;
  salary_max?: number | null;
  salary_curr?: string | null;

  exp_min?: number | null;
  exp_max?: number | null;
  exp_unit?: string | null;

  skills?: string[];

  posted_date?: string | null;

  // IMPORTANT:
  // This is the exact tracked URL returned by Artha.
  url: string;
}