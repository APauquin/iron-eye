import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type LiftId = "deadlift" | "squat" | "bench" | "overhead";
export type BodyPart = "head" | "torso" | "arms" | "femur" | "shin" | "feet";
export type Priority = "high" | "medium" | "low";
export type Step = "select" | "upload" | "analysing" | "results";

export interface Lift {
  id: LiftId;
  name: string;
  icon: string;
  desc: string;
  tip: string;
  colour: string;
  available: boolean;
  guidelines: string[];
  trimHint: string;
}

export interface Correction {
  issue: string;
  fix: string;
  priority: Priority;
  bodyParts: BodyPart[];
}

/** Shape returned by the backend's POST /api/analyze. */
export interface AnalysisResult {
  summary: string;
  strengths: string[];
  corrections: Correction[];
  cues: string[];
}

export interface TrimWindow {
  start: number;
  end: number;
  duration: number;
}

export type Pose = NormalizedLandmark[] | null;

/** An uploaded video plus the object URL used to preview it. */
export interface VideoFile {
  file: File;
  url: string;
}

/** Per-frame pose data captured from the whole trimmed clip. */
export interface ClipCapture {
  timestamps: number[];
  /** 33 landmarks per frame as [x, y, visibility], or null when nobody was detected. */
  poses: (number[][] | null)[];
  width: number;
  height: number;
  /** Evenly spaced JPEG frames (base64) for the results strip and the AI coach. */
  keyFrames: string[];
  keyPoses: Pose[];
}

/** Bar path and speed, computed locally by the backend from the pose data. */
export interface MotionResult {
  calibrated: boolean;
  side: "left" | "right";
  detectionRate: number;
  fps: number;
  warnings: string[];
  series: { t: number[]; x: number[]; y: number[]; v: number[] };
  phases: { concentricStart: number; concentricEnd: number; descentStart: number | null; bottom: number | null };
  metrics: {
    romCm: number | null;
    concentricS: number;
    meanVelocity: number | null;
    peakVelocity: number | null;
    peakVelocityT: number;
    stickingPointT: number | null;
    stickingPointHeightCm: number | null;
    maxDriftCm: number | null;
    descentS: number | null;
    descentVelocity: number | null;
  };
}
