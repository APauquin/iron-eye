import { FONT_DISPLAY } from "../theme.ts";

const SIZE = 130;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreRing({ score, colour }: { score: number; colour: string }) {
  const dash = (score / 10) * CIRCUMFERENCE;
  const centre = SIZE / 2;

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE, margin: "0 auto 20px" }}>
      <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={centre} cy={centre} r={RADIUS} fill="none" stroke="#ffffff18" strokeWidth="7" />
        <circle
          cx={centre}
          cy={centre}
          r={RADIUS}
          fill="none"
          stroke={colour}
          strokeWidth="7"
          strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 48, lineHeight: 1, color: colour }}>{score}</span>
        <span style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em" }}>/ 10</span>
      </div>
    </div>
  );
}
