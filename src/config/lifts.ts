import type { BodyPart, Lift, Priority } from "../types.ts";

export const MAX_CLIP_SECONDS = 6;
export const MIN_CLIP_SECONDS = 0.8;
export const FRAME_COUNT = 6;
export const MAX_UPLOAD_MB = 300;

export const BODY_PARTS: BodyPart[] = ["head", "torso", "arms", "femur", "shin", "feet"];

export const LIFTS: Lift[] = [
  {
    id: "deadlift",
    name: "Deadlift",
    icon: "ti-barbell",
    desc: "Bar from floor to lockout",
    tip: "Film from the side — full body in frame",
    colour: "#E05C1A",
    available: true,
    guidelines: [
      "Camera: side-on view, around hip height.",
      "Frame: full body visible from feet to head, including the bar for the whole rep.",
      "Rep: show setup, bar leaving the floor, full lockout, and controlled return.",
      "Avoid: cropped feet, moving camera, dark lighting, or filming from the front.",
    ],
    trimHint: "Trim from the moment the bar leaves the floor to full lockout — exclude setup and bar return.",
  },
  {
    id: "squat",
    name: "Squat",
    icon: "ti-arrow-down",
    desc: "Depth, tracking & drive",
    tip: "Film 45° or side-on — include feet",
    colour: "#2D7DD2",
    available: true,
    guidelines: [
      "Camera: 45° rear/front angle or side-on, around hip height.",
      "Frame: include feet, knees, hips, torso, and head during the full rep.",
      "Rep: show walkout/setup, descent, depth, drive up, and lockout.",
      "Avoid: cropped feet, plates blocking knees, shaky camera, or very low light.",
    ],
    trimHint: "Trim from the start of your descent to standing lockout — exclude walkout.",
  },
  {
    id: "bench",
    name: "Bench Press",
    icon: "ti-arrows-horizontal",
    desc: "Bar path, arch & lockout",
    tip: "Film from the side — bench level",
    colour: "#3DAA6E",
    available: false,
    guidelines: [
      "Camera: side-on view at bench level.",
      "Frame: include wrists, elbows, shoulders, chest, bench, and bar path.",
      "Rep: show unrack/setup, touch point, press, and lockout.",
      "Avoid: filming from behind the head or cropping the bar path.",
    ],
    trimHint: "Trim from the start of the descent through the touch to full lockout — exclude unrack.",
  },
  {
    id: "overhead",
    name: "Overhead Press",
    icon: "ti-upload",
    desc: "Bar path, head position, lockout",
    tip: "Film from the side — full body in frame",
    colour: "#F59E0B",
    available: false,
    guidelines: [
      "Camera: side-on view, around chest height.",
      "Frame: full body visible from feet to hands overhead, including the bar path.",
      "Rep: show setup, press start, head-through position, and lockout.",
      "Avoid: cropping the bar overhead or filming from the front only.",
    ],
    trimHint: "Trim from press initiation at shoulder level to overhead lockout — exclude clean or rack pull.",
  },
];

export const FILMING_TIPS: [icon: string, text: string][] = [
  ["ti-focus-2", "Film full body — feet to head in frame"],
  ["ti-bulb", "Good lighting — avoid dark or backlit gyms"],
  ["ti-repeat", "Capture setup + full rep + lockout"],
  ["ti-maximize", "Keep camera still — prop it up if possible"],
];

export const PRIORITY_STYLES: Record<Priority, { bg: string; border: string; text: string; label: string; order: number }> = {
  high: { bg: "#FF3B3020", border: "#FF3B3040", text: "#FF6B5B", label: "HIGH", order: 0 },
  medium: { bg: "#F59E0B18", border: "#F59E0B35", text: "#F59E0B", label: "MED", order: 1 },
  low: { bg: "#ffffff0a", border: "#ffffff18", text: "#888", label: "LOW", order: 2 },
};
