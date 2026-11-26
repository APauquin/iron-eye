import type { AnalysisResult, LiftId } from "../types.ts";

// Empty in development: Vite proxies /api to the FastAPI server.
const API_URL = import.meta.env.VITE_API_URL ?? "";

/** Send frames to the Iron Eye backend, which holds the API key and calls Claude. */
export async function analyseFrames(frames: string[], lift: LiftId): Promise<AnalysisResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lift, frames }),
    });
  } catch {
    throw new Error("Can't reach the Iron Eye server. Is it running?");
  }

  if (!res.ok) {
    const body: { detail?: unknown } = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Server error ${res.status}`);
  }
  return res.json();
}
