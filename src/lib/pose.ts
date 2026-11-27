import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// Must match the installed @mediapipe/tasks-vision version in package.json.
const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

// Video mode requires timestamps that only ever increase for the life of the model,
// even when a new clip (or an earlier part of the same video) is analysed.
let timelineEndMs = 0;

async function createLandmarker(): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(vision, options("GPU"));
  } catch (err) {
    // GPU acceleration often isn't available in Linux browsers; the CPU is slower but reliable.
    console.warn("Pose model: GPU unavailable, using CPU.", err);
    return PoseLandmarker.createFromOptions(vision, options("CPU"));
  }
}

/** Load the pose model once (in video mode, so it tracks smoothly frame to frame) and reuse it. */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker().catch((err) => {
      landmarkerPromise = null; // allow a retry later
      throw err;
    });
  }
  return landmarkerPromise;
}

/**
 * Reserve a stretch of the model's timeline for a clip of `spanMs` milliseconds and
 * return its starting timestamp. Each clip continues after the previous one.
 */
export function reserveTimeline(spanMs: number): number {
  const start = timelineEndMs + 1000;
  timelineEndMs = start + Math.ceil(spanMs) + 1;
  return start;
}

/** Drop the model after an error so the next analysis starts with a fresh one. */
export function resetPoseLandmarker(): void {
  const current = landmarkerPromise;
  landmarkerPromise = null;
  current?.then((landmarker) => landmarker.close()).catch(() => {});
}
