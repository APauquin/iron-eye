import type { AnalysisResult, ClipCapture, LiftId, MotionResult } from "../types.ts";

// Empty in development: Vite proxies /api to the FastAPI server.
const API_URL = import.meta.env.VITE_API_URL ?? "";

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the Iron Eye server. Is it running?");
  }

  if (!res.ok) {
    const data: { detail?: unknown } = await res.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `Server error ${res.status}`);
  }
  return res.json();
}

/** AI coach notes: the backend holds the API key and calls Claude with a few key frames. */
export function analyseFrames(frames: string[], lift: LiftId): Promise<AnalysisResult> {
  return post("/api/analyze", { lift, frames });
}

/** Bar path, speed and phases from every frame's pose. Computed by the backend, no AI cost. */
export function analyseMotion(capture: ClipCapture, lift: LiftId, heightCm: number | null): Promise<MotionResult> {
  return post("/api/motion", {
    lift,
    heightCm,
    imageWidth: capture.width,
    imageHeight: capture.height,
    timestamps: capture.timestamps,
    poses: capture.poses,
  });
}
