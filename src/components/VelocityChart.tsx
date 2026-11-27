import { useState } from "react";
import type { PointerEvent } from "react";
import { nearestIndex, niceTicks } from "../lib/chart.ts";
import type { MotionResult } from "../types.ts";

const W = 340;
const H = 190;
const PAD = { top: 26, right: 12, bottom: 26, left: 40 };
const GRID = "#1f1f1f";
const AXIS_TEXT = "#6a6a6a";

interface VelocityChartProps {
  motion: MotionResult;
  colour: string;
}

/** Vertical bar speed over the clip, with the "up" phase shaded and key moments marked. */
export default function VelocityChart({ motion, colour }: VelocityChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const { t, v } = motion.series;
  const { phases, metrics, calibrated } = motion;
  const t0 = t[0];
  const times = t.map((value) => value - t0);
  const duration = times[times.length - 1];

  const vMin = Math.min(0, ...v);
  const vMax = Math.max(0.1, ...v);
  const span = vMax - vMin;
  const yTicks = niceTicks(vMin - span * 0.05, vMax + span * 0.05, 4);
  const yLow = Math.min(yTicks[0], vMin);
  const yHigh = Math.max(yTicks[yTicks.length - 1], vMax);

  const sx = (time: number) => PAD.left + (time / duration) * (W - PAD.left - PAD.right);
  const sy = (speed: number) => PAD.top + ((yHigh - speed) / (yHigh - yLow)) * (H - PAD.top - PAD.bottom);
  const line = times.map((time, i) => `${i === 0 ? "M" : "L"}${sx(time).toFixed(1)},${sy(v[i]).toFixed(1)}`).join("");

  const upFrom = sx(phases.concentricStart - t0);
  const upTo = sx(phases.concentricEnd - t0);
  const downFrom = phases.descentStart === null ? null : sx(phases.descentStart - t0);
  const downTo = phases.bottom === null ? null : sx(phases.bottom - t0);
  const peakIndex = nearestIndex(t, metrics.peakVelocityT);
  const stickIndex = metrics.stickingPointT === null ? null : nearestIndex(t, metrics.stickingPointT);
  const unit = calibrated ? " m/s" : "";

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const time = ((x - PAD.left) / (W - PAD.left - PAD.right)) * duration;
    setHover(time < 0 || time > duration ? null : nearestIndex(times, time));
  };

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
        role="img"
        aria-label={`Bar speed over time. Average speed up ${metrics.meanVelocity ?? "unknown"}${unit}, peak ${metrics.peakVelocity ?? "unknown"}${unit}.`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        {downFrom !== null && downTo !== null && (
          <>
            <rect x={downFrom} y={PAD.top} width={Math.max(0, downTo - downFrom)} height={H - PAD.top - PAD.bottom} fill="#ffffff" opacity={0.03} />
            <text x={(downFrom + downTo) / 2} y={PAD.top + 13} fill={AXIS_TEXT} fontSize={10} textAnchor="middle">
              Down
            </text>
          </>
        )}
        <rect x={upFrom} y={PAD.top} width={Math.max(0, upTo - upFrom)} height={H - PAD.top - PAD.bottom} fill={colour} opacity={0.1} />
        <text x={(upFrom + upTo) / 2} y={PAD.top + 13} fill={AXIS_TEXT} fontSize={10} textAnchor="middle">
          Up
        </text>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(tick)} y2={sy(tick)} stroke={tick === 0 ? "#3a3a3a" : GRID} strokeWidth={1} />
            {calibrated && (
              <text x={PAD.left - 6} y={sy(tick) + 3} fill={AXIS_TEXT} fontSize={10} textAnchor="end">
                {tick.toFixed(1)}
              </text>
            )}
          </g>
        ))}
        {niceTicks(0, duration, 5).map((tick) => (
          <text key={tick} x={sx(tick)} y={H - 8} fill={AXIS_TEXT} fontSize={10} textAnchor="middle">
            {tick}s
          </text>
        ))}

        <path d={line} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={sx(times[peakIndex])} cy={sy(v[peakIndex])} r={4} fill={colour} stroke="#080808" strokeWidth={2} />
        {stickIndex !== null && (
          <g>
            <circle cx={sx(times[stickIndex])} cy={sy(v[stickIndex])} r={5} fill="none" stroke="#F0F0F0" strokeWidth={1.5} />
            <text x={sx(times[stickIndex])} y={sy(v[stickIndex]) + 16} fill="#B8B8B8" fontSize={10} textAnchor="middle">
              sticking point
            </text>
          </g>
        )}

        {hover !== null && (
          <g pointerEvents="none">
            <line x1={sx(times[hover])} x2={sx(times[hover])} y1={PAD.top} y2={H - PAD.bottom} stroke="#8a8a8a" strokeWidth={1} />
            <circle cx={sx(times[hover])} cy={sy(v[hover])} r={4} fill={colour} stroke="#080808" strokeWidth={2} />
            <text x={W - PAD.right} y={12} fill="#E0E0E0" fontSize={11} textAnchor="end">
              {times[hover].toFixed(2)} s{calibrated ? ` · ${v[hover].toFixed(2)} m/s` : ""}
            </text>
          </g>
        )}
        {calibrated && hover === null && (
          <text x={PAD.left} y={12} fill={AXIS_TEXT} fontSize={10}>
            m/s · up is positive
          </text>
        )}
      </svg>
      <figcaption style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
        Filled dot = peak speed{stickIndex !== null ? " · ring = where the bar slowed most on the way up" : ""}. Drag across the chart to read values.
      </figcaption>
    </figure>
  );
}
