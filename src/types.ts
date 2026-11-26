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
  overallScore: number;
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
