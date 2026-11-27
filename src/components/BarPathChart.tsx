import { nearestIndex } from "../lib/chart.ts";
import type { MotionResult } from "../types.ts";

const W = 300;
const H = 340;
const PAD = 26;
const MIN_HALF_WIDTH_CM = 12; // keep small drifts from being blown up out of proportion

interface BarPathChartProps {
  motion: MotionResult;
  colour: string;
}

/**
 * The bar's path from the side, drawn to true scale (1 cm across = 1 cm up).
 * The way up is coloured by speed: faint = slow, solid = fast.
 */
export default function BarPathChart({ motion, colour }: BarPathChartProps) {
  const { series, phases, metrics, calibrated } = motion;
  const factor = 100; // metres → cm (or body heights → % when uncalibrated)
  const xs = series.x.map((value) => value * factor);
  const ys = series.y.map((value) => value * factor);

  const start = nearestIndex(series.t, phases.concentricStart);
  const end = nearestIndex(series.t, phases.concentricEnd);
  const centre = xs[start];
  const halfWidth = Math.max(MIN_HALF_WIDTH_CM, ...xs.map((x) => Math.abs(x - centre))) * 1.15;
  const top = Math.max(...ys) * 1.05 + 2;
  const bottom = Math.min(...ys) - 4;

  const scale = Math.min((W - 2 * PAD) / (2 * halfWidth), (H - 2 * PAD) / (top - bottom));
  const sx = (x: number) => W / 2 + (x - centre) * scale;
  const sy = (y: number) => H - PAD - (y - bottom) * scale;

  const fullPath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join("");
  const upSpeeds = series.v.slice(start, end + 1);
  const fastest = Math.max(1e-6, ...upSpeeds);
  const stick = metrics.stickingPointT === null ? null : nearestIndex(series.t, metrics.stickingPointT);
  const gridStep = 10;
  const gridLines: number[] = [];
  for (let g = Math.ceil(bottom / gridStep) * gridStep; g <= top; g += gridStep) gridLines.push(g);

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", maxWidth: 320, height: "auto", display: "block", margin: "0 auto" }}
        role="img"
        aria-label={`Bar path from the side. Drifts at most ${metrics.maxDriftCm ?? "an unknown amount"} cm from a straight line.`}
      >
        {calibrated &&
          gridLines.map((g) => (
            <g key={g}>
              <line x1={PAD} x2={W - PAD} y1={sy(g)} y2={sy(g)} stroke="#1a1a1a" strokeWidth={1} />
              <text x={W - PAD} y={sy(g) - 3} fill="#555" fontSize={9} textAnchor="end">
                {g} cm
              </text>
            </g>
          ))}

        <line x1={sx(centre)} x2={sx(centre)} y1={PAD - 6} y2={H - PAD + 6} stroke="#444" strokeWidth={1} strokeDasharray="4 4" />
        <path d={fullPath} fill="none" stroke="#3a3a3a" strokeWidth={1.5} strokeLinejoin="round" />

        {upSpeeds.slice(1).map((speed, i) => {
          const a = start + i;
          const b = a + 1;
          const strength = Math.max(0, speed) / fastest;
          return (
            <line
              key={a}
              x1={sx(xs[a])}
              y1={sy(ys[a])}
              x2={sx(xs[b])}
              y2={sy(ys[b])}
              stroke={colour}
              strokeOpacity={0.25 + 0.75 * strength}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          );
        })}

        <circle cx={sx(xs[start])} cy={sy(ys[start])} r={5} fill="#080808" stroke={colour} strokeWidth={2} />
        <text x={sx(xs[start]) + 9} y={sy(ys[start]) + 4} fill="#999" fontSize={10}>
          bottom
        </text>
        <circle cx={sx(xs[end])} cy={sy(ys[end])} r={5} fill={colour} stroke="#080808" strokeWidth={2} />
        <text x={sx(xs[end]) + 9} y={sy(ys[end]) + 4} fill="#999" fontSize={10}>
          lockout
        </text>
        {stick !== null && (
          <g>
            <circle cx={sx(xs[stick])} cy={sy(ys[stick])} r={6} fill="none" stroke="#F0F0F0" strokeWidth={1.5} />
            <text x={sx(xs[stick]) - 10} y={sy(ys[stick]) + 4} fill="#B8B8B8" fontSize={10} textAnchor="end">
              sticking point
            </text>
          </g>
        )}
      </svg>
      <figcaption style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 11, color: "#666", marginTop: 6 }}>
        <span>slow</span>
        <span style={{ width: 70, height: 4, borderRadius: 2, background: `linear-gradient(to right, ${colour}40, ${colour})` }} />
        <span>fast</span>
        <span style={{ marginLeft: 8 }}>· dashed = perfectly vertical</span>
      </figcaption>
    </figure>
  );
}
