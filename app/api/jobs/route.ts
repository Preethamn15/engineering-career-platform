import { NextRequest, NextResponse } from "next/server";
import { getArthaJobs } from "@/lib/artha";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await getArthaJobs({
      limit: Math.min(
        Number(searchParams.get("limit")) || 20,
        100
      ),
      offset: Number(searchParams.get("offset")) || 0,
      location: searchParams.get("location") || undefined,
      state: searchParams.get("state") || undefined,
      city: searchParams.get("city") || undefined,
      q: searchParams.get("q") || undefined,
      categories:
        searchParams.get("categories") || undefined,
      job_type:
        searchParams.get("job_type") || undefined,
      work_mode:
        searchParams.get("work_mode") || undefined,
      sort_by:
        searchParams.get("sort_by") || "newest",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Artha API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_REQUEST_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Unable to fetch jobs.",
        },
      },
      { status: 500 }
    );
  }
}