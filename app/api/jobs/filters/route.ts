import { NextResponse } from "next/server";

const ARTHA_BASE_URL =
  "https://api-india.artha.link/api/v1";

export async function GET() {
  try {
    const apiKey = process.env.ARTHA_API_KEY;

    if (!apiKey) {
      throw new Error("ARTHA_API_KEY is not configured.");
    }

    const response = await fetch(
      `${ARTHA_BASE_URL}/jobs/filters`,
      {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || {
            message: "Failed to fetch filters.",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FILTERS_REQUEST_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Unable to fetch filters.",
        },
      },
      { status: 500 }
    );
  }
}