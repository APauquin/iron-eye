import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Pose } from "../types.ts";

// Must match the installed @mediapipe/tasks-vision version in package.json.
const MEDIAPIPE_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/** Load the pose model once and reuse it. */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_URL).then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        numPoses: 1,
      }),
    );
  }
  return landmarkerPromise;
}

/** Detect body landmarks in one base64 JPEG frame. Returns null if no person is found. */
export async function detectPose(base64: string): Promise<Pose> {
  try {
    const landmarker = await getPoseLandmarker();
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    await img.decode();
    return landmarker.detect(img).landmarks[0] ?? null;
  } catch (err) {
    console.warn("Pose detection failed for frame:", err);
    return null;
  }
}
