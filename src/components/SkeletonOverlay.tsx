import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { BodyPart, Pose } from "../types.ts";
import { COLOURS } from "../theme.ts";

// MediaPipe Pose landmark indices (left, right)
const NOSE = 0;
const SHOULDERS = [11, 12] as const;
const WRISTS = [15, 16] as const;
const HIPS = [23, 24] as const;
const KNEES = [25, 26] as const;
const ANKLES = [27, 28] as const;

type Point = NormalizedLandmark | undefined;

/** Use whichever side of the body the camera sees more clearly. */
function clearerSide(landmarks: NormalizedLandmark[], [left, right]: readonly [number, number]): Point {
  const l = landmarks[left];
  const r = landmarks[right];
  if (!l) return r;
  if (!r) return l;
  return (l.visibility ?? 0) >= (r.visibility ?? 0) ? l : r;
}

function Segment({ a, b, colour }: { a: Point; b: Point; colour: string }) {
  if (!a || !b) return null;
  return (
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colour} strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  );
}

function Joint({ p }: { p: Point }) {
  if (!p) return null;
  return <circle cx={p.x} cy={p.y} r="0.012" fill="#fff" stroke="#000" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />;
}

interface SkeletonOverlayProps {
  pose: Pose;
  problemParts: Set<BodyPart>;
}

/** Side-view stick figure drawn over a frame; flagged body parts turn red. */
export default function SkeletonOverlay({ pose, problemParts }: SkeletonOverlayProps) {
  if (!pose) return null;

  const colourFor = (part: BodyPart) => (problemParts.has(part) ? COLOURS.bad : COLOURS.good);
  const head = pose[NOSE];
  const shoulder = clearerSide(pose, SHOULDERS);
  const wrist = clearerSide(pose, WRISTS);
  const hip = clearerSide(pose, HIPS);
  const knee = clearerSide(pose, KNEES);
  const ankle = clearerSide(pose, ANKLES);

  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {head && (
        <circle
          cx={head.x}
          cy={head.y}
          r="0.05"
          fill={colourFor("head")}
          fillOpacity="0.35"
          stroke={colourFor("head")}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <Segment a={shoulder} b={hip} colour={colourFor("torso")} />
      <Segment a={shoulder} b={wrist} colour={colourFor("arms")} />
      <Segment a={hip} b={knee} colour={colourFor("femur")} />
      <Segment a={knee} b={ankle} colour={colourFor("shin")} />
      {[shoulder, hip, knee, ankle, wrist].map((p, i) => (
        <Joint key={i} p={p} />
      ))}
    </svg>
  );
}
